
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors'); 
// const bcrypt = require('bcryptjs'); 
// require('dotenv').config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: 'https://room-3t00.onrender.com' }));
app.use(cors({
    origin: 'https://roomshift.netlify.app',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("Could not connect to MongoDB", err));

// 1. User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String }
});
const User = mongoose.model('User', userSchema);

// 2. Booking Schema
const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    userPhone: String,
    userEmail: String,
    houseSize: String,
    moveDate: String,
    price: String,
    pickupAddress: String, 
    destinationAddress: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema);

// --- 3. NEW: The Register Route ---
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ 
            msg: "User registered successfully", 
            user: { id: newUser._id, email: newUser.email } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. The Login Route ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User does not exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        res.json({ 
            msg: "Login successful!", 
            user: { id: user._id, email: user.email } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. The Booking Route (Cleaned up) ---
app.post('/api/book-move', async (req, res) => {
    try {
        const { userId, userName, userPhone, userEmail, houseSize, moveDate, price, pickupAddress, destinationAddress } = req.body;
        
        // Validation
        if(!pickupAddress || !destinationAddress) {
            return res.status(400).json({ msg: "Pickup and Destination addresses are required." });
        }

        const newBooking = new Booking({
            userId, 
            userName,
            userPhone,
            userEmail, 
            houseSize, 
            moveDate, 
            price,
            pickupAddress,
            destinationAddress
        });

        const savedBooking = await newBooking.save();
        console.log("Saved to DB:", savedBooking);

        res.status(201).json({ msg: "Booking confirmed successfully!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- 6. Get bookings for a specific user ---
app.get('/api/my-bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await Booking.find({ userId: userId }).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Could not fetch history" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});