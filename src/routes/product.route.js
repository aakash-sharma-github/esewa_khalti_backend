import { Router } from "express";
import { createProduct, paymentRoute } from "../controllers/products.controller.js";

const router = Router();

router.route("/create-product").post(createProduct);

router.route("/").get(paymentRoute)

export default router