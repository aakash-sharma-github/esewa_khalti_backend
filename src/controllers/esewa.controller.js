import { getEsewaPaymentHash, verifyEsewaPayment } from "../middlewares/esewa.middleware.js";
import { Payment } from "../models/payment.model.js";
import { Product } from "../models/product.model.js";
import { PurchasedProduct } from "../models/purchasedProduct.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeEsewa = asyncHandler(async (req, res) => {
    try {
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
            transaction_id: purchasedProductData._id
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

const completePayment = asyncHandler(async (req, res) => {
    // * get payment data from query string.
    const { requestedPaymentData } = req.query;
    console.log(`req: ${req.query}`)

    try {
        // * verify payment with esewa
        const paymentInformation = await verifyEsewaPayment(requestedPaymentData);
        console.log(`payment: ${paymentInformation}`)

        // Check if paymentInformation is valid
        if (!paymentInformation) {
            throw new ApiError(500, 'Payment verification failed.');
        }

        // * find purchased product in db by transaction id
        const purchasedProductData = await PurchasedProduct.findById(
            paymentInformation.response.transaction_id
        );

        // * check if purchased product exists
        if (!purchasedProductData) {
            throw new ApiError(404, 'Purchased product not found.');
        }

        // * create payment in db
        const paymentData = await Payment.create({
            pidx: paymentInformation.decoded_signature.transaction_code,
            transactionId: paymentInformation.decoded_signature.transaction_id,
            productId: paymentInformation.response.transaction_id,
            amount: paymentInformation.totalPrice,
            dataFromVerificationReq: paymentInformation,
            apiQueryFromUser: req.query,
            paymentGateway: 'esewa',
            status: "success"
        })

        // * update purchased product in db to completed
        await PurchasedProduct.findByIdAndUpdate(
            paymentInformation.response.transaction_id,
            {
                $set: {
                    status: "completed"
                }
            }
        )

        // * return response with payment data
        return res.status(200)
            .json(new ApiResponse(200, paymentData, "Payment completed successfully."));

    } catch (error) {
        console.log(error);
        throw new ApiError(500, error.message);
    }
})

const createProduct = asyncHandler(async (req, res) => {
    try {
        const { name, price, category } = req.body;

        // * check if all fields are filled.
        if (!name || !price || !category) {
            throw new ApiError(400, 'All fields are required.');
        }

        // * create product in db
        const productData = await Product.create({
            name: name,
            price: price,
            category: category
        })

        // * return response with product data
        return res.status(200)
            .json(new ApiResponse(200, productData, "Product created successfully."));
    } catch (error) {
        console.log(error)
        throw new ApiError(500, error.message);
    }
})

const paymentRoute = asyncHandler(async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../templates/index.html'));
    } catch (error) {
        console.error(error);
    }
});

export {
    initializeEsewa,
    completePayment,
    createProduct,
    paymentRoute
}