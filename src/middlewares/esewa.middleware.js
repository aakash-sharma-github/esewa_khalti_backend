import axios from 'axios'
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
const { createHmac } = await import('node:crypto');

const getEsewaPaymentHash = asyncHandler(async ({ amount, transaction_uuid }) => {
    try {
        const data = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${process.env.ESEWA_PRODUCT_CODE}`;

        const secretKey = process.env.ESEWA_SECRET_KEY;
        const hash = createHmac('sha256', secretKey).update(data).digest('base64');
        console.log(`hash: ${hash}`)

        const successSignature = {
            signature: hash,
            signed_field_names: "total_amount,transaction_uuid,product_code",
        }

        return new ApiResponse(200, successSignature, "Signature generated successfully");

    } catch (error) {
        console.log(error);
        throw new ApiError(500, error.message);
    }
})

// const verifyEsewaPayment = asyncHandler(async (encoded_signature) => {
//     try {
//         let decoded_signature = atob(encoded_signature);
//         decoded_signature = await JSON.parse(decoded_signature);

//         console.log(`decoded_signature: ${decoded_signature}`)

//         let headers = {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//         }

//         const data = `transaction_code=${decoded_signature.transaction_code},
//         status=${decoded_signature.status},total_amount=${decoded_signature.totalPrice},
//         transaction_uuid=${decoded_signature.transaction_uuid},product_code=${process.env.PRODUCT_CODE},
//         signed_field_names=${decoded_signature.signed_field_names}`;

//         const secretKey = process.env.ESEWA_SECRET_KEY;
//         const hash = createHmac('sha256', secretKey).update(data).digest('base64');

//         let reqOption = {
//             url: `${process.env.ESEWA_GATEWAY_URL}/api/epay/transaction/status/?
//             product_code=${process.env.ESEWA_PRODUCT_CODE}&total_amount=${decoded_signature.totalPrice}&
//             transaction_uuid=${decoded_signature.transaction_uuid}`,
//             method: "GET",
//             headers: headers
//         };
//         if (hash !== decoded_signature.signature) {
//             throw new ApiError(401, "Signature verification failed. Invalid information.");
//         }

//         let response = await axios.request(reqOption);
//         if (response.data.status !== "COMPLETE" ||
//             response.data.transaction_uuid !== decoded_signature.transaction_uuid ||
//             Number(response.data.totalPrice) !== Number(decoded_signature.totalPrice)
//         ) {
//             throw new ApiError(402, "Payment verification failed. Invalid information.");
//         }

//         const responseData = {
//             res: response.data,
//             decoded_signature: decoded_signature
//         }

//         console.log(`responseData: ${responseData}`)

//         return new ApiResponse(200, responseData, "Payment verified successfully");

//     } catch (error) {
//         console.error("Error during payment verification:", error);
//         throw new ApiError(500, error.message);

//     }
// })

const verifyEsewaPayment = asyncHandler(async (query) => {
    try {
        const { data } = query;
        if (!data) {
            throw new ApiError(400, "Missing payment data");
        }

        let decodedData;
        try {
            decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
        } catch (error) {
            throw new ApiError(400, "Invalid payment data format");
        }

        console.log("Decoded data:", decodedData);

        const {
            transaction_code,
            status,
            total_amount,
            transaction_uuid,
            product_code,
            signed_field_names,
            signature
        } = decodedData;

        // Verify the signature
        const fieldsToSign = signed_field_names.split(',');
        const dataToVerify = fieldsToSign.map(field => `${field}=${decodedData[field]}`).join(',');

        const secretKey = process.env.ESEWA_SECRET_KEY;
        const calculatedSignature = createHmac('sha256', secretKey).update(dataToVerify).digest('base64');

        console.log("Calculated signature:", calculatedSignature);
        console.log("Received signature:", signature);

        if (calculatedSignature !== signature) {
            throw new ApiError(401, "Invalid signature");
        }

        // Verify payment status with eSewa API
        let headers = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        let reqOption = {
            url: `${process.env.ESEWA_GATEWAY_URL}/api/epay/transaction/status/?product_code=${process.env.ESEWA_PRODUCT_CODE}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`,
            method: "GET",
            headers: headers
        };

        let response = await axios.request(reqOption);

        if (response.data.status !== "COMPLETE" ||
            response.data.transaction_uuid !== transaction_uuid ||
            response.data.total_amount !== total_amount
        ) {
            throw new ApiError(402, "Payment verification failed. Invalid information.");
        }

        return new ApiResponse(200, decodedData, "Payment verified successfully");

    } catch (error) {
        console.error("Error during payment verification:", error);
        throw new ApiError(error.statusCode || 500, error.message);
    }
});

export {
    getEsewaPaymentHash,
    verifyEsewaPayment
}
