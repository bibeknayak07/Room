import express from "express";
const router = express.Router();

router.post("/login", (req, res) => {
  res.json({ success: true, message: "Login endpoint working" });
});

router.post("/register", (req, res) => {
  res.json({ success: true, message: "Register endpoint working" });
});

export default router;