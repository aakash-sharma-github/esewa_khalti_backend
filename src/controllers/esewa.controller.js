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
    // * get payment data from query string.
    const { requestedPaymentData } = req.query;
    console.log(`req: ${req.query}`)

     // * Validate that the payment data is a valid Base64 string
     if (!requestedPaymentData || !/^[A-Za-z0-9+/=]+$/.test(requestedPaymentData)) {
        throw new ApiError(400, "Invalid payment data format.");
    }

    try {
        // * verify payment with esewa
        const paymentInformation = await verifyEsewaPayment(requestedPaymentData);
        console.log(`payment: ${paymentInformation}`)

        // * Check if paymentInformation is valid
        if (!paymentInformation) {
            throw new ApiError(500, 'Payment verification failed.');
        }

        // * find purchased product in db by transaction id
        const purchasedProductData = await PurchasedProduct.findById(
            paymentInformation.response.transaction_uuid
        );

        // * check if purchased product exists
        if (!purchasedProductData) {
            throw new ApiError(404, 'Purchased product not found.');
        }

        // * Try decoding payment information fields
        let transactionCode, transactionUUID;
        try {
            transactionCode = atob(paymentInformation.decoded_signature.transaction_code);
            transactionUUID = atob(paymentInformation.decoded_signature.transaction_uuid);
        } catch (decodeError) {
            throw new ApiError(500, 'Failed to decode payment data. Invalid encoding.');
        }

        // * create payment in db
        const paymentData = await Payment.create({
            pidx: transactionCode,
            transactionId: transactionUUID,
            productId: paymentInformation.response.transaction_uuid,
            amount: paymentInformation.totalPrice,
            dataFromVerificationReq: paymentInformation,
            apiQueryFromUser: req.query,
            paymentGateway: 'esewa',
            status: "success"
        })

        // * update purchased product in db to completed
        await PurchasedProduct.findByIdAndUpdate(
            paymentInformation.response.transaction_uuid,
            {
                $set: {
                    status: "success"
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


export {
    initializeEsewa,
    completeEsewaPayment
}