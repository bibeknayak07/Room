# Payment Gateway Integration Guide

This guide explains how to set up and use the eSewa and Khalti payment gateways in the Room Shifting application.

## Features Implemented

✅ **eSewa Payment Integration** - Supports NPR currency payments via eSewa  
✅ **Khalti Payment Integration** - Supports Khalti digital wallet payments  
✅ **Payment Status Tracking** - Track payment status (Unpaid, Pending, Paid, Failed)  
✅ **Transaction IDs** - Generate and store unique transaction IDs  
✅ **Payment Modal** - User-friendly payment method selection  

## Setup Instructions

### 1. eSewa Configuration

#### Getting eSewa Merchant Code

1. Visit [eSewa Merchant Portal](https://esewa.com.np)
2. Sign up as a merchant and get your **Merchant Code**
3. For testing, use: `EPAYTEST`
4. Add to `.env` file:
   ```
   ESEWA_MERCHANT_CODE=your_merchant_code
   ```

#### eSewa API Details

- **Test URL**: `https://uat.esewa.com.np/epay/main`
- **Production URL**: `https://esewa.com.np/epay/main`
- **Required Parameters**:
  - `amt`: Amount (without decimal)
  - `psc`: Packing/Service Charge (0)
  - `pdc`: Penalty/Discount Charge (0)
  - `txAmt`: Tax Amount (0)
  - `tAmt`: Total Amount
  - `pid`: Product/Transaction ID (unique)
  - `scd`: Merchant Code
  - `su`: Success URL
  - `fu`: Failure URL

### 2. Khalti Configuration

#### Getting Khalti API Keys

1. Visit [Khalti Merchant Dashboard](https://dashboard.khalti.com)
2. Create a merchant account
3. Generate **Public Key** and **Secret Key**
4. Add to `.env` file:
   ```
   KHALTI_PUBLIC_KEY=your_public_key_here
   KHALTI_SECRET_KEY=your_secret_key_here
   ```

#### Khalti API Details

- **Checkout Script**: `https://khalti.s3.amazonaws.com/KhaltiCheckout.js`
- **Verify URL**: `https://khalti.com/api/v2/payment/verify/`
- **Amount Format**: In paisa (1 NPR = 100 paisa)

## API Endpoints

### eSewa Endpoints

#### 1. Initiate eSewa Payment
```
POST /api/payment/esewa/initiate
Content-Type: application/json

{
    "bookingId": "booking_id_string",
    "amount": 5000
}

Response:
{
    "success": true,
    "paymentUrl": "https://uat.esewa.com.np/epay/main",
    "params": { ... }
}
```

#### 2. eSewa Success Handler
```
GET /api/payment/esewa/success?o=&refId=&pid=
Updates booking payment status to "Paid"
```

#### 3. eSewa Failure Handler
```
GET /api/payment/esewa/failure?pid=
Updates booking payment status to "Failed"
```

### Khalti Endpoints

#### 1. Initiate Khalti Payment
```
POST /api/payment/khalti/initiate
Content-Type: application/json

{
    "bookingId": "booking_id_string",
    "amount": 5000
}

Response:
{
    "success": true,
    "khaltiPublicKey": "key",
    "transactionId": "TXN-...",
    "amount": 500000 (in paisa)
}
```

#### 2. Verify Khalti Payment
```
POST /api/payment/khalti/verify
Content-Type: application/json

{
    "token": "khalti_token",
    "amount": 5000,
    "transactionId": "TXN-..."
}

Response:
{
    "success": true,
    "transactionId": "khalti_transaction_id"
}
```

## Frontend Integration

### Using Payment Module

The payment functionality is available through the `PaymentGateway` object in `payment.js`:

```javascript
// Initiate eSewa Payment
PaymentGateway.initiateESewaPayment(bookingId, amount);

// Initiate Khalti Payment
PaymentGateway.initiateKhaltiPayment(bookingId, amount, userName, userEmail);

// Show Payment Modal (both gateways)
showPaymentModal(bookingId, amount, userName, userEmail);
```

### Payment Flow

1. User completes booking form
2. Booking is saved to database
3. Payment modal appears offering two options: eSewa or Khalti
4. User selects payment method
5. For eSewa: User is redirected to eSewa portal
6. For Khalti: Khalti checkout modal appears
7. After successful payment, booking status is updated
8. User is redirected back to application

## Database Schema Updates

The Booking schema includes payment fields:

```javascript
{
    paymentStatus: String,    // "Unpaid", "Pending", "Paid", "Failed"
    paymentMethod: String,    // "eSewa", "Khalti"
    transactionId: String     // Unique transaction identifier
}
```

## Testing

### Test eSewa Payment

1. Use merchant code: `EPAYTEST`
2. Test wallet credentials:
   - Phone: 9841234567
   - PIN: 1234
3. Amount: Any value

### Test Khalti Payment

1. Use test public/secret keys from dashboard
2. Test card: Use 9841234567 or any test number
3. OTP: Any 4-digit number

## Security Notes

⚠️ **Important Security Considerations**:

1. **Secret Keys**: Never expose `KHALTI_SECRET_KEY` in frontend code
2. **Verification**: Always verify payments on backend before updating booking status
3. **HTTPS**: Use HTTPS in production for all payment endpoints
4. **Environment Variables**: Store all API keys in `.env` file, not in code
5. **Amount Validation**: Validate amount on backend before processing payment

## Troubleshooting

### eSewa Payment Issues

- **Payment window not opening**: Check if eSewa URL is correct
- **Form submission fails**: Verify merchant code in `.env`
- **Transaction not verified**: Check success/failure URL callbacks

### Khalti Payment Issues

- **Checkout not loading**: Ensure Khalti script is loading correctly
- **Verification fails**: Check if keys are correct
- **Amount mismatch**: Ensure amount is multiplied by 100 (paisa conversion)

## Production Deployment

1. Update URLs in `.env`:
   ```
   API_URL=https://your-production-url.com
   ```

2. Change eSewa URL from UAT to Production:
   ```javascript
   const esewaPaymentUrl = `https://esewa.com.np/epay/main`;
   ```

3. Use production merchant codes and API keys

4. Test end-to-end payment flow

5. Monitor transaction logs for any issues

## Additional Resources

- [eSewa Documentation](https://esewa.com.np)
- [Khalti API Documentation](https://docs.khalti.com)
- [Payment Gateway Integration Best Practices](https://www.pci-dss.org/)
