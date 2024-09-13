import { Router } from "express";
import {
    completeEsewaPayment,
    initializeEsewa,
} from "../controllers/esewa.controller.js";

const router = Router()

router.route("/initialize-esewa").post(initializeEsewa);

router.route("/complete-esewa-payment").get(completeEsewaPayment);

export default router