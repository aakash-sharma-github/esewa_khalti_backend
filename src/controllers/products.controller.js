import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
    createProduct,
    paymentRoute
}