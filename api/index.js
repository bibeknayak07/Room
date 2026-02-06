import express from "express";
import cors from "cors";
import authRoutes from "./auth.js";

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

app.get("/api/test", (req, res) => {
  res.json({ message: "API working on Render 🚀" });
});

export default app;
