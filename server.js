import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// 1. GLOBAL HEADERS & CORS
app.use(express.json());

// Manually handling CORS to avoid the path-to-regexp error in Node v24
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

// Serve static files from the public directory
app.use(express.static('public'));

// --- 2. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("Could not connect to MongoDB", err));

// --- 3. SCHEMAS ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String }
});
const User = mongoose.model('User', userSchema);

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
    paymentStatus: { type: String, default: 'Unpaid' }, // Unpaid, Paid, Failed
    paymentMethod: String, // 'eSewa', 'Khalti', etc
    transactionId: String,
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema);

// --- 4. ROUTES ---

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

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

// Login
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

// Book a Move
app.post('/api/book-move', async (req, res) => {
    try {
        const { userId, userName, userPhone, userEmail, houseSize, moveDate, price, pickupAddress, destinationAddress } = req.body;
        
        if(!pickupAddress || !destinationAddress) {
            return res.status(400).json({ msg: "Pickup and Destination addresses are required." });
        }

        const newBooking = new Booking({
            userId, userName, userPhone, userEmail, 
            houseSize, moveDate, price, pickupAddress, destinationAddress
        });

        const savedBooking = await newBooking.save();
        res.status(201).json({ msg: "Booking confirmed successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// History
app.get('/api/my-bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await Booking.find({ userId: userId }).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// --- 5. PAYMENT ROUTES ---

// Initiate eSewa Payment
app.post('/api/payment/esewa/initiate', async (req, res) => {
    try {
        const { bookingId, amount, successUrl, failureUrl } = req.body;
        
        if (!bookingId || !amount) {
            return res.status(400).json({ msg: "Booking ID and amount are required" });
        }

        // eSewa merchant code (replace with your actual merchant code)
        const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
        const ESEWA_SUCCESS_URL = successUrl || 'http://localhost:5000/api/payment/esewa/success';
        const ESEWA_FAILURE_URL = failureUrl || 'http://localhost:5000/api/payment/esewa/failure';

        // Generate unique transaction ID
        const transactionId = `TXN-${Date.now()}-${bookingId}`;

        // Update booking with pending payment
        await Booking.findByIdAndUpdate(bookingId, {
            transactionId: transactionId,
            paymentMethod: 'eSewa',
            paymentStatus: 'Pending'
        });

        // eSewa payment parameters
        const esewaPaymentUrl = `https://uat.esewa.com.np/epay/main`;
        
        res.json({
            success: true,
            paymentUrl: esewaPaymentUrl,
            params: {
                amt: amount,
                psc: 0,
                pdc: 0,
                txAmt: 0,
                tAmt: amount,
                pid: transactionId,
                scd: ESEWA_MERCHANT_CODE,
                su: ESEWA_SUCCESS_URL,
                fu: ESEWA_FAILURE_URL
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// eSewa Payment Success Handler
app.get('/api/payment/esewa/success', async (req, res) => {
    try {
        const { o, refId, pid } = req.query;

        if (!pid) {
            return res.status(400).send('Payment failed: Invalid transaction');
        }

        // Update booking payment status
        const booking = await Booking.findByIdAndUpdate(pid.split('-')[2], {
            paymentStatus: 'Paid',
            transactionId: refId
        });

        res.json({
            success: true,
            msg: 'Payment successful!',
            booking: booking
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// eSewa Payment Failure Handler
app.get('/api/payment/esewa/failure', async (req, res) => {
    try {
        const { pid } = req.query;

        if (!pid) {
            return res.status(400).send('Invalid transaction');
        }

        // Update booking payment status
        await Booking.findByIdAndUpdate(pid.split('-')[2], {
            paymentStatus: 'Failed'
        });

        res.json({
            success: false,
            msg: 'Payment failed'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Initiate Khalti Payment
app.post('/api/payment/khalti/initiate', async (req, res) => {
    try {
        const { bookingId, amount } = req.body;
        
        if (!bookingId || !amount) {
            return res.status(400).json({ msg: "Booking ID and amount are required" });
        }

        // Khalti Public Key (replace with your actual key)
        const KHALTI_PUBLIC_KEY = process.env.KHALTI_PUBLIC_KEY || 'test_public_key';
        
        // Generate unique transaction ID
        const transactionId = `TXN-${Date.now()}-${bookingId}`;

        // Update booking with pending payment
        await Booking.findByIdAndUpdate(bookingId, {
            transactionId: transactionId,
            paymentMethod: 'Khalti',
            paymentStatus: 'Pending'
        });

        res.json({
            success: true,
            khaltiPublicKey: KHALTI_PUBLIC_KEY,
            transactionId: transactionId,
            amount: amount * 100, // Khalti expects amount in paisa (cents)
            productName: 'Room Shifting Service',
            productUrl: 'https://roomshift.netlify.app',
            eventHandler: {
                onSuccess: '/api/payment/khalti/success',
                onError: '/api/payment/khalti/failure'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Khalti Payment Verification
app.post('/api/payment/khalti/verify', async (req, res) => {
    try {
        const { token, amount, transactionId } = req.body;
        const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key';

        // Call Khalti API to verify payment
        const khaltiResponse = await fetch('https://khalti.com/api/v2/payment/verify/', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                amount: amount * 100 // in paisa
            })
        });

        const khaltiData = await khaltiResponse.json();

        if (khaltiResponse.ok && khaltiData.success) {
            // Update booking payment status
            const bookingId = transactionId.split('-')[2];
            await Booking.findByIdAndUpdate(bookingId, {
                paymentStatus: 'Paid',
                transactionId: khaltiData.transaction_id
            });

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

// --- 6. START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});