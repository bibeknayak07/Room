import express from "express";
import cors from "cors";
import authRoutes from "./auth.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/test", (req, res) => {
  res.json({ message: "API working on Vercel 🚀" });
});

export default app;
