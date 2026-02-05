import express from "express";
const router = express.Router();

router.post("/login", (req, res) => {
  res.json({ success: true });
});

const signupForm = document.getElementById('signupForm'); // Ensure your <form> has this ID

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;

    try {
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, phone })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration Successful! Now you can login.");
            window.location.href = 'login.html'; // Redirect to login
        } else {
            alert("Error: " + data.msg);
        }
    } catch (err) {
        console.error("Connection error:", err);
    }
});

export default router;