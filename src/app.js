import express from "express";
import cors from "cors";

const app = express();

// cors only allows specific domains to interact with our backend
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
};
app.use(cors(corsOptions));

// accept json files upto 20kb.
app.use(express.json({ limit: "20kb" }));

// Handle preflight requests
app.options("*", cors());

// search input url encoder and modify urls limit upto 20kb.
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// import routers because of segrigated code.
import productRouter from "./routes/product.route.js"
import esewaRouter from "./routes/esewa.route.js"
import khaltiRouter from "./routes/khalti.route.js"

// router decleration
app.use("/api/products", productRouter);
app.use("/api/payment-esewa", esewaRouter);
app.use("/api/payment-khalti", khaltiRouter);

export { app };
