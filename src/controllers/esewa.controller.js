import { getEsewaPaymentHash, verifyEsewaPayment } from "../middlewares/esewa.middleware.js";
import { Payment } from "../models/payment.model.js";
import { Product } from "../models/product.model.js";
import { PurchasedProduct } from "../models/purchasedProduct.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const initializeEsewa = asyncHandler(async (req, res) => {
    try {
        // * get payment data from body
        const { productId, totalPrice } = req.body;
        // * check if product exists and price is correct
        const productData = await Product.findOne({
            _id: productId,
            price: Number(totalPrice)
        });

        // * check if product exists
        if (!productData) {
            throw new ApiError(404, 'Product not found.');
        }

        // * create purchased product in db
        const purchasedProductData = await PurchasedProduct.create({
            productId: productId,
            paymentMethod: 'esewa',
            totalPrice: totalPrice
        });

        // * create esewa payment
        const paymentInitiate = await getEsewaPaymentHash({
            amount: totalPrice,
            transaction_uuid: purchasedProductData._id
        })

        const responseData = {
            payment: paymentInitiate,
            purchasedProduct: purchasedProductData
        }

        return res.status(200)
            .json(new ApiResponse(200, responseData, "Esewa payment initialized successfully."));

    } catch (error) {
        console.log(error)
        throw new ApiError(500, error.message);
    }
})

const completeEsewaPayment = asyncHandler(async (req, res) => {
    console.log("Received query parameters:", req.query);

    // Validate query parameters
    if (!req.query || Object.keys(req.query).length === 0) {
        throw new ApiError(400, "Missing payment data in query parameters");
    }

    // * get encoded data from query
    const encodedData = Object.values(req.query)[0]; // Assuming the encoded data is the first (and only) value

    // * check if encoded data is valid
    if (!encodedData || !/^[A-Za-z0-9+/=]+$/.test(encodedData)) {
        throw new ApiError(400, "Invalid payment data format");
    }

    try {
        const paymentInformation = await verifyEsewaPayment(encodedData);
        console.log("Payment verification result:", paymentInformation);

        // * check if payment information is valid
        if (!paymentInformation || !paymentInformation.response) {
            throw new ApiError(500, 'Payment verification failed');
        }

        const { transaction_uuid } = paymentInformation.response;
        const purchasedProductData = await PurchasedProduct.findById(transaction_uuid);

        // * check if purchased product exists
        if (!purchasedProductData) {
            throw new ApiError(404, 'Purchased product not found');
        }

        const { transaction_code, transaction_uuid: decodedUUID } = paymentInformation.decoded_signature;

        // * create payment in db
        const paymentData = await Payment.create({
            pidx: atob(transaction_code),
            transactionId: atob(decodedUUID),
            productId: transaction_uuid,
            amount: paymentInformation.totalPrice,
            dataFromVerificationReq: paymentInformation,
            apiQueryFromUser: req.query,
            paymentGateway: 'esewa',
            status: "completed"
        });

        // * update purchased product status
        await PurchasedProduct.findByIdAndUpdate(transaction_uuid, {
            $set: { status: "completed" }
        });

        return res.status(200).json(new ApiResponse(200, paymentData, "Payment completed successfully"));

    } catch (error) {
        console.error("Error in completeEsewaPayment:", error);
        const statusCode = error instanceof ApiError ? error.statusCode : 500;
        const message = error instanceof ApiError ? error.message : "An error occurred while processing the payment";
        return res.status(statusCode).json(new ApiResponse(statusCode, null, message));
    }
});


export {
    initializeEsewa,
    completeEsewaPayment
}