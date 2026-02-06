import express from "express";
import cors from "cors";
import authRoutes from "./auth.js";
import mongoose from "mongoose";

const app = express();

// CORS configuration
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://roomshift.netlify.app',
        'https://room-3t00.onrender.com',
        'http://127.0.0.1:5000',
        'http://localhost:5000',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use("/api/auth", authRoutes);

// Payment routes
app.post("/api/payment/esewa/initiate", (req, res) => {
    const { bookingId, amount } = req.body;
    const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
    
    const transactionId = `TXN-${Date.now()}-${bookingId}`;
    
    res.json({
        success: true,
        paymentUrl: 'https://uat.esewa.com.np/epay/main',
        params: {
            amt: amount,
            psc: 0,
            pdc: 0,
            txAmt: 0,
            tAmt: amount,
            pid: transactionId,
            scd: ESEWA_MERCHANT_CODE,
            su: `${process.env.API_URL || 'https://room-3t00.onrender.com'}/api/payment/esewa/success`,
            fu: `${process.env.API_URL || 'https://room-3t00.onrender.com'}/api/payment/esewa/failure`
        }
    });
});

app.post("/api/payment/khalti/initiate", (req, res) => {
    const { bookingId, amount } = req.body;
    const KHALTI_PUBLIC_KEY = process.env.KHALTI_PUBLIC_KEY || 'test_public_key';
    
    const transactionId = `TXN-${Date.now()}-${bookingId}`;
    
    res.json({
        success: true,
        khaltiPublicKey: KHALTI_PUBLIC_KEY,
        transactionId: transactionId,
        amount: amount * 100
    });
});

app.post("/api/payment/khalti/verify", async (req, res) => {
    const { token, amount } = req.body;
    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key';

    try {
        const khaltiResponse = await fetch('https://khalti.com/api/v2/payment/verify/', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                amount: amount * 100
            })
        });

        if (khaltiResponse.ok) {
            const khaltiData = await khaltiResponse.json();
            res.json({
                success: true,
                msg: 'Payment verified successfully!',
                transactionId: khaltiData.transaction_id
            });
        } else {
            res.status(400).json({
                success: false,
                msg: 'Payment verification failed'
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working on Render 🚀" });
});

export default app;
