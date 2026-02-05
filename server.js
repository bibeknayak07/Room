import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// --- 1. MIDDLEWARE ---
app.use(express.json());

// FIXED CORS: Combined everything into one clean block
app.use(cors({
    origin: ['https://roomshift.netlify.app', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Handle Pre-flight requests
app.options('(.*)', cors());

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

// --- 5. START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});