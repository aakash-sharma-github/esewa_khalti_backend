import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String,
            unique: true
        },
        pidx: {
            type: String,
            unique: true
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PurchasedProduct",
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        dataFromVerificationReq: {
            type: Object
        },
        apiQueryFromUser: {
            type: Object
        },
        paymentGateway: {
            type: String,
            enum: ["khalti", "esewa"],
            required: true
        },
        status: {
            type: String,
            enum: ["success", "pending", "failed"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

export const Payment = mongoose.model("Payment", paymentSchema);
