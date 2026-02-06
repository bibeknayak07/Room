// Payment Integration Module
const PaymentGateway = {
    // Initialize eSewa Payment
    initiateESewaPayment: async function(bookingId, amount) {
        try {
            const API_URL = "https://room-3t00.onrender.com";
            
            const response = await fetch(`${API_URL}/api/payment/esewa/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: bookingId,
                    amount: amount,
                    successUrl: `${API_URL}/api/payment/esewa/success`,
                    failureUrl: `${API_URL}/api/payment/esewa/failure`
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Create form and submit to eSewa
                this.submitToEsewa(data.paymentUrl, data.params);
            } else {
                alert('Failed to initiate eSewa payment');
            }
        } catch (err) {
            console.error('eSewa payment error:', err);
            alert('Error initiating payment: ' + err.message);
        }
    },

    // Submit form to eSewa gateway
    submitToEsewa: function(paymentUrl, params) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentUrl;
        
        Object.keys(params).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = params[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
    },

    // Initialize Khalti Payment
    initiateKhaltiPayment: async function(bookingId, amount, userName, userEmail) {
        try {
            const API_URL = "https://room-3t00.onrender.com";
            
            const response = await fetch(`${API_URL}/api/payment/khalti/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: bookingId,
                    amount: amount
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Initialize Khalti Checkout
                this.loadKhaltiCheckout(data, bookingId, amount, userName, userEmail);
            } else {
                alert('Failed to initiate Khalti payment');
            }
        } catch (err) {
            console.error('Khalti payment error:', err);
            alert('Error initiating payment: ' + err.message);
        }
    },

    // Load and initialize Khalti Checkout
    loadKhaltiCheckout: function(paymentData, bookingId, amount, userName, userEmail) {
        // Load Khalti script if not already loaded
        if (typeof KhaltiCheckout === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://khalti.s3.amazonaws.com/KhaltiCheckout.js';
            script.onload = () => {
                this.openKhaltiCheckout(paymentData, bookingId, amount, userName, userEmail);
            };
            document.body.appendChild(script);
        } else {
            this.openKhaltiCheckout(paymentData, bookingId, amount, userName, userEmail);
        }
    },

    // Open Khalti Checkout modal
    openKhaltiCheckout: function(paymentData, bookingId, amount, userName, userEmail) {
        const API_URL = "https://room-3t00.onrender.com";
        
        let config = {
            "publicKey": paymentData.khaltiPublicKey,
            "productIdentity": bookingId,
            "productName": "Room Shifting Service",
            "productUrl": "https://roomshift.netlify.app",
            "eventHandler": {
                onSuccess(payload) {
                    // Verify payment with backend
                    fetch(`${API_URL}/api/payment/khalti/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: payload.token,
                            amount: amount,
                            transactionId: paymentData.transactionId
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            alert('Payment successful! Transaction ID: ' + data.transactionId);
                            location.reload();
                        } else {
                            alert('Payment verification failed');
                        }
                    })
                    .catch(err => {
                        console.error('Verification error:', err);
                        alert('Error verifying payment');
                    });
                },
                onError(error) {
                    alert('Payment failed: ' + error.body.errorMessage);
                },
                onClose() {
                    console.log('Payment window closed');
                }
            },
            "amount": amount * 100 // in paisa
        };

        let checkout = new KhaltiCheckout(config);
        checkout.show({ "amount": amount * 100 });
    }
};

// Helper function to show payment modal
function showPaymentModal(bookingId, amount, userName, userEmail) {
    const paymentModal = document.createElement('div');
    paymentModal.id = 'paymentModal';
    paymentModal.innerHTML = `
        <div class="payment-modal-overlay">
            <div class="payment-modal-content">
                <div class="payment-modal-header">
                    <h2>Select Payment Method</h2>
                    <button class="close-btn" onclick="document.getElementById('paymentModal').remove()">×</button>
                </div>
                <div class="payment-options">
                    <button class="payment-btn esewa-btn" onclick="PaymentGateway.initiateESewaPayment('${bookingId}', ${amount})">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23060'/%3E%3Ctext x='50' y='60' text-anchor='middle' font-size='40' fill='white' font-weight='bold'%3Ee%3C/text%3E%3C/svg%3E" alt="eSewa" />
                        <span>Pay with eSewa</span>
                    </button>
                    <button class="payment-btn khalti-btn" onclick="PaymentGateway.initiateKhaltiPayment('${bookingId}', ${amount}, '${userName}', '${userEmail}')">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23512BA5'/%3E%3Ctext x='50' y='60' text-anchor='middle' font-size='35' fill='white' font-weight='bold'%3EK%3C/text%3E%3C/svg%3E" alt="Khalti" />
                        <span>Pay with Khalti</span>
                    </button>
                </div>
                <div class="payment-amount">
                    <p>Total Amount: <strong>Rs ${amount.toLocaleString()}</strong></p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .payment-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        
        .payment-modal-content {
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .payment-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
        }
        
        .payment-modal-header h2 {
            margin: 0;
            font-size: 24px;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #666;
        }
        
        .payment-options {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .payment-btn {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 16px;
            font-weight: 500;
        }
        
        .payment-btn:hover {
            border-color: #333;
            background: #f9f9f9;
        }
        
        .payment-btn img {
            width: 40px;
            height: 40px;
        }
        
        .payment-amount {
            text-align: center;
            padding-top: 15px;
            border-top: 1px solid #ddd;
        }
        
        .payment-amount p {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
    `;
    
    if (!document.querySelector('style[data-payment-styles]')) {
        style.setAttribute('data-payment-styles', 'true');
        document.head.appendChild(style);
    }
}
