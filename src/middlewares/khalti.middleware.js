import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// * Function to initialize Khalti Payment
const initializeKhaltiPayment = asyncHandler(async (details) => {
    try {

        const headersList = {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            "Content-Type": "application/json",
        };

        const bodyContent = JSON.stringify({
            public_key: process.env.KHALTI_PUBLIC_KEY,
            ...details
        });

        const reqOptions = {
            url: `${process.env.KHALTI_GATEWAY_URI}/initiate/`,
            method: "POST",
            headers: headersList,
            data: bodyContent,
        };

        const response = await axios.request(reqOptions);

        // * Handle unsuccessful payment initialization
        if (!response || response.status !== 200 || !response.data) {
            throw new ApiError(500, 'Failed to initialize payment with Khalti');
        }

        return new ApiResponse(200, response.data, "Payment initialized successfully");

    } catch (error) {

        if (error.response) {
            console.error("Error response data from Khalti:", JSON.stringify(error.response.data, null, 2));
            throw new ApiError(500, JSON.stringify(error.response.data));
        } else {
            console.error(`Error initializing payment: ${error.message}`);
            throw new ApiError(500, error.message);
        }
    }
});

// * Function to verify Khalti Payment
const verifyKhaltiPayment = asyncHandler(async (pidx) => {
    try {

        const headersList = {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            "Content-Type": "application/json",
        };
        const bodyContent = JSON.stringify({ pidx });

        console.log(`headersList: ${JSON.stringify(headersList)}`);
        console.log("bodyContent:", bodyContent);

        const reqOptions = {
            url: `${process.env.KHALTI_GATEWAY_URI}/lookup/`,
            method: "POST",
            headers: headersList,
            data: bodyContent,
        };

        const response = await axios.request(reqOptions);
        console.log("response:", response.data);

        if (!response || !response.data || response.status !== 200) {
            throw new ApiError(500, 'Invalid response from Khalti');
        }

        return new ApiResponse(200, response.data, "Payment verified successfully");

    } catch (error) {
        console.error(`Error verifying Khalti payment: ${error}`);
        throw new ApiError(500, error.response?.data || error.message);
    }
});

export { verifyKhaltiPayment, initializeKhaltiPayment };
