import axios from 'axios'
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
const { createHmac } = await import('node:crypto');

const getEsewaPaymentHash = asyncHandler(async ({ amount, transaction_id }) => {
    try {
        const data = `total_amount=${amount},transaction_id=${transaction_id},
        product_code=${process.env.ESEWA_PRODUCT_CODE}`;

        console.log(`data: ${data}`);

        const secretKey = process.env.ESEWA_SECRET_KEY;
        const hash = createHmac('sha256', secretKey).update(data).digest('base64');

        const successSignature = {
            signature: hash,
            signed_field: "total_amount,transaction_id,product_code",
        }

        return new ApiResponse(200, successSignature, "Signature generated successfully");


    } catch (error) {
        console.log(error);
        throw new ApiError(500, error.message);
    }
})

const verifyEsewaPayment = asyncHandler(async (encoded_signature) => {
    try {
        let decoded_signature = atob(encoded_signature);
        decoded_signature = await JSON.parse(decoded_signature);

        let headers = {
            Accept: "application/json",
            "Content-Type": "application/json",
        }

        const data = `transaction_code=${decoded_signature.transaction_code},
        status=${decoded_signature.status},total_amount=${decoded_signature.totalPrice},
        transaction_id=${decoded_signature.transaction_id},product_code=${process.env.PRODUCT_CODE},
        signed_field=${decoded_signature.signed_field}`;

        const secretKey = process.env.ESEWA_SECRET_KEY;
        const hash = createHmac('sha256', secretKey).update(data).digest('base64');

        let reqOption = {
            url: `${process.env.ESEWA_GATEWAY_URL}/api/epay/transaction/status/?
            product_code=${process.env.ESEWA_PRODUCT_CODE}&total_amount=${decoded_signature.totalPrice}&
            transaction_id=${decoded_signature.transaction_id}`,
            method: "GET",
            headers: headers
        };
        if (hash !== decoded_signature.signature) {
            throw new ApiError(401, "Signature verification failed. Invalid information.");
        }

        let response = await axios.request(reqOption);
        if (response.data.status !== "COMPLETE" ||
            response.data.transaction_id !== decoded_signature.transaction_id ||
            Number(response.data.totalPrice) !== Number(decoded_signature.totalPrice)
        ) {
            throw new ApiError(402, "Payment verification failed. Invalid information.");
        }

        const responseData = {
            res: response.data,
            decoded_signature: decoded_signature
        }

        return new ApiResponse(200, responseData, "Payment verified successfully");

    } catch (error) {

    }
})

export {
    getEsewaPaymentHash,
    verifyEsewaPayment
}