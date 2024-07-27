import mongoose from "mongoose";

const purchasedProductSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        paymentMethod: {
            type: String,
            enum: ["esewa", "khalti"],
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
            required: true
        }
    }, {
    timestamps: true
});

export const PurchasedProduct = mongoose.model("PurchasedProduct", purchasedProductSchema);