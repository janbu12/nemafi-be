# Order & Payment System Documentation

## Overview
Sistem order dan payment yang mendukung workflow lengkap dari registrasi hingga pembayaran melalui Midtrans.

## Workflow

### 1. **Registration dengan Package Selection**
- User melakukan register dan memilih paket
- Order otomatis dibuat dengan status `PENDING_REVIEW`
- Field order akan berisi:
  - `userId`: ID user
  - `status`: PENDING_REVIEW
  - `total`: Harga paket
  - `items`: OrderItem dengan packageId

**Endpoint:**
```
POST /auth/register
Body:
{
  "email": "user@example.com",
  "password": "password123",
  "fullname": "John Doe",
  "phone_number": "08123456789",
  "full_address": "Jl. Contoh No. 123",
  "province": "DKI Jakarta",
  "city": "Jakarta Pusat",
  "district": "Menteng",
  "subdistrict": "Cempaka Putih",
  "packageId": 1
}
```

### 2. **Admin Review Order**
- Admin masuk dashboard dan melihat orders dengan status `PENDING_REVIEW`
- Admin bisa approve atau reject order

**Endpoint untuk Get Pending Orders:**
```
GET /orders/admin/pending-review
Headers: Authorization: Bearer <token>
(User harus role TECH_ADMIN)
```

**Endpoint untuk Approve:**
```
POST /orders/:id/approve
Headers: Authorization: Bearer <token>
Body: {
  "notes": "Order approved - sesuai dengan coverage area"
}
```

**Endpoint untuk Reject:**
```
POST /orders/:id/reject
Headers: Authorization: Bearer <token>
Body: {
  "notes": "Area tidak tercakup oleh layanan kami"
}
```

- Jika approved: status berubah menjadi `REVIEW_APPROVED` → Customer bisa lanjut ke payment
- Jika rejected: status berubah menjadi `REVIEW_REJECTED` → Order selesai (gagal)

### 3. **Customer View Orders**
Customer bisa melihat semua orders mereka:

**Endpoint:**
```
GET /orders
Headers: Authorization: Bearer <token>
```

Mendapat list orders dengan status, detail item, total, dan payment info.

**Get Detail Order:**
```
GET /orders/:id
Headers: Authorization: Bearer <token>
```

### 4. **Initiate Payment (Midtrans)**
Setelah order di-approve (status = `REVIEW_APPROVED`), customer bisa mulai pembayaran.

Customer submit data untuk create payment token:

**Endpoint:**
```
POST /payments/create-token
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "orderId": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment token created successfully",
  "data": {
    "snapToken": "token_xxxx",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v1/....."
  }
}
```

### 5. **Payment Process**
- Frontend menggunakan `snapToken` untuk membuka Midtrans Snap modal
- Atau redirect user ke `redirectUrl` untuk payment
- Customer complete payment di Midtrans
- Midtrans mengirim callback notification ke server

### 6. **Payment Callback Handling**
Midtrans akan POST ke endpoint notification:

**Endpoint (no auth needed):**
```
POST /payments/notification
```

Server akan:
- Verify signature dari Midtrans
- Update order status menjadi `SURVEY_SCHEDULED` jika payment berhasil
- Update order status tetap `REVIEW_APPROVED` jika payment gagal/pending

### 7. **Check Payment Status**
Customer bisa check status pembayaran mereka:

**Endpoint:**
```
GET /payments/:orderId/status
Headers: Authorization: Bearer <token>
```

## Setup Environment Variables

Tambahkan ke file `.env`:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
NODE_ENV=development  # atau 'production'
APP_URL=http://localhost:3000  # URL frontend Anda
```

**Cara mendapatkan Midtrans credentials:**
1. Login ke https://dashboard.midtrans.com
2. Go to Settings → Access Keys
3. Copy Server Key dan Client Key
4. Untuk development, gunakan Sandbox environment
5. Untuk production, gunakan Production environment

## Database Schema

Order model updated dengan fields:
- `midtransTransactionId`: Token dari Midtrans
- `midtransOrderId`: Order ID yang dikirim ke Midtrans
- `redirectUrl`: Redirect URL dari Midtrans untuk payment

## API Endpoints Summary

### Orders
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | /orders | ✓ | CUSTOMER | Get user's orders |
| GET | /orders/:id | ✓ | CUSTOMER/TECH_ADMIN | Get order detail |
| POST | /orders | ✓ | CUSTOMER | Create order manually |
| POST | /orders/:id/approve | ✓ | TECH_ADMIN | Approve order |
| POST | /orders/:id/reject | ✓ | TECH_ADMIN | Reject order |
| GET | /orders/admin/pending-review | ✓ | TECH_ADMIN | Get pending orders |

### Payments
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /payments/create-token | ✓ | CUSTOMER | Create Midtrans token |
| POST | /payments/notification | ✗ | - | Midtrans callback |
| GET | /payments/:orderId/status | ✓ | CUSTOMER | Check payment status |
| GET | /payments/finish/:orderId | ✗ | - | Payment finish callback |
| GET | /payments/unfinish/:orderId | ✗ | - | Payment unfinish callback |
| GET | /payments/error/:orderId | ✗ | - | Payment error callback |

## Status Flow

```
PENDING_REVIEW
    ↓
[Admin Review]
    ├─→ REVIEW_APPROVED (jika approve)
    │       ↓
    │   [Customer Payment]
    │       ↓
    │   SURVEY_SCHEDULED (payment success)
    │       ↓
    │   [Next steps...]
    │
    └─→ REVIEW_REJECTED (jika reject)
```

## Testing dengan Postman

### 1. Register User
```
POST http://localhost:3000/auth/register
{
  "email": "test@example.com",
  "password": "password123",
  "fullname": "Test User",
  "phone_number": "08123456789",
  "full_address": "Jl. Test No. 1",
  "province": "DKI Jakarta",
  "city": "Jakarta Pusat",
  "district": "Menteng",
  "subdistrict": "Cempaka Putih",
  "packageId": 1
}
```

### 2. Get Orders
```
GET http://localhost:3000/orders
Headers:
  Authorization: Bearer <token_dari_register>
```

### 3. Approve Order (As Admin)
Login sebagai admin terlebih dahulu, kemudian:
```
POST http://localhost:3000/orders/1/approve
Headers:
  Authorization: Bearer <admin_token>
Body:
{
  "notes": "Order approved"
}
```

### 4. Create Payment Token
```
POST http://localhost:3000/payments/create-token
Headers:
  Authorization: Bearer <customer_token>
Body:
{
  "orderId": 1,
  "name": "Test User",
  "email": "test@example.com",
  "phone": "08123456789"
}
```

## Troubleshooting

### Error: "Order must be in REVIEW_APPROVED status to process payment"
- Pastikan order sudah di-approve oleh admin terlebih dahulu

### Midtrans Callback tidak diterima
- Pastikan `MIDTRANS_SERVER_KEY` benar
- Setup Midtrans dashboard untuk URL notification yang sesuai
- Check server logs untuk signature verification errors

### Payment notification tidak update order
- Verify signature dari Midtrans untuk memastikan authentic
- Check order ID format di notification

## Next Steps

1. **Setup database migration** dengan `npm run prisma:migrate`
2. **Configure Midtrans credentials** di `.env`
3. **Test endpoint** dengan Postman atau client
4. **Setup Midtrans notification URL** di dashboard Midtrans
5. **Deploy** ke server production

## Frontend Integration

### Menggunakan Midtrans Snap (Recommended)

```javascript
// Include Snap Script
<script src="https://app.midtrans.com/snap/snap.js"></script>

// atau untuk sandbox
<script src="https://app.sandbox.midtrans.com/snap/snap.js"></script>

// Create token dari API
const response = await fetch('/payments/create-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '08123456789'
  })
});

const data = await response.json();

// Trigger Snap modal
snap.pay(data.data.snapToken, {
  onSuccess: function(result) {
    // Handle success
    console.log('Payment successful', result);
  },
  onPending: function(result) {
    // Handle pending
    console.log('Payment pending', result);
  },
  onError: function(result) {
    // Handle error
    console.log('Payment error', result);
  },
  onClose: function() {
    // Handle close
    console.log('Customer closed the popup');
  }
});
```

### Redirect Method

```javascript
// Redirect ke Midtrans URL
const response = await fetch('/payments/create-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '08123456789'
  })
});

const data = await response.json();
window.location.href = data.data.redirectUrl;
```
