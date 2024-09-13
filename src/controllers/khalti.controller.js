import { initializeKhaltiPayment, verifyKhaltiPayment } from "../middlewares/khalti.middleware.js";
import { Product } from "../models/product.model.js";
import { PurchasedProduct } from "../models/purchasedProduct.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const initializeKhalti = asyncHandler(async (req, res) => {
    try {
        const { productId, totalPrice, website_url } = req.body;

        // * Ensure the product exists and the price matches
        const productData = await Product.findOne({
            _id: productId,
            price: Number(totalPrice),
        });

        if (!productData) {
            throw new ApiError(404, 'Product not found.');
        }

        // * Create a purchased product in the database
        const purchasedProductData = await PurchasedProduct.create({
            productId,
            paymentMethod: 'khalti',
            totalPrice: totalPrice * 100, // Convert to paisa
        });

        // * Initialize the Khalti payment
        const paymentInitiate = await initializeKhaltiPayment({
            amount: totalPrice * 100, // Khalti expects amount in paisa
            purchase_order_id: purchasedProductData._id,
            purchase_order_name: productData.name,
            website_url: website_url,
            return_url: `${process.env.BACKEND_URI}/complete-khalti-payment`,
        });

        if (!paymentInitiate) {
            throw new ApiError(500, 'Failed to initialize payment with Khalti.');
        }

        const responseData = {
            payment: paymentInitiate,
            purchasedProduct: purchasedProductData,
        };

        return res.status(200).json(new ApiResponse(200, responseData, "Khalti payment initiated successfully."));
    } catch (error) {
        console.error(`Error initializing Khalti payment: ${error}`);
        throw new ApiError(500, error.message);
    }
});

const completeKhaltiPayment = asyncHandler(async (req, res) => {
    const {
        pidx,
        txnId,
        amount,
        mobile,
        purchase_order_id,
        purchase_order_name,
        transaction_id,
    } = req.query;

    console.log(`Query: ${JSON.stringify(req.query)}`);

    try {
        // * Verify payment with Khalti
        const paymentInfo = await verifyKhaltiPayment(pidx);

        if (paymentInfo?.status !== "success" || paymentInfo.transaction_id !== transaction_id) {
            throw new ApiError(500, "Payment verification failed.");
        }

        // * Find the purchased product in the database
        const purchasedProductData = await PurchasedProduct.find({
            _id: purchase_order_id,
            totalPrice: amount,
        });

        if (!purchasedProductData) {
            throw new ApiError(404, "Purchased product not found.");
        }

        // * Create payment entry in the database
        const paymentData = await Payment.create({
            pidx,
            transactionId: transaction_id,
            productId: purchase_order_id,
            amount,
            dataFromVerificationReq: paymentInfo,
            apiQueryFromUser: req.query,
            paymentGateway: "khalti",
            status: "success",
        });

        // * Update the purchased product's status
        await PurchasedProduct.findByIdAndUpdate(purchase_order_id, {
            $set: {
                status: "success",
            },
        });

        return res.status(200).json(new ApiResponse(200, paymentData, "Payment completed successfully."));
    } catch (error) {
        console.error(`Error completing Khalti payment: ${error}`);
        throw new ApiError(500, error.message);
    }
});

export { initializeKhalti, completeKhaltiPayment };
