import { Router } from "express";
import {
    completePayment,
    createProduct,
    initializeEsewa,
    paymentRoute
} from "../controllers/esewa.controller.js";

const router = Router()

router.route("/initialize-esewa").post(initializeEsewa);

router.route("/complete-payment").get(completePayment);

router.route("/create-product").post(createProduct);

router.route("/").get(paymentRoute)

export default router