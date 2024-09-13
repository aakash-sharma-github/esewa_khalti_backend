import { Router } from "express";
import { 
    completeKhaltiPayment, 
    initializeKhalti 
} from "../controllers/khalti.controller.js";

const router = Router();

router.route("/initilize-khalti").post(initializeKhalti);

router.route("/complete-khalti-payment").get(completeKhaltiPayment)


export default router
