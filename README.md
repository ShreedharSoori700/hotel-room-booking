# Hotel Room Booking Management System

Full-stack hotel management project with:
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- Authentication: JWT + bcrypt
- Validation: frontend + backend
- Admin dashboard: rooms, users, bookings
- Payment: Razorpay test-mode integration (optional)

## 1. Install
Open a terminal in `backend`:

```bash
npm install
```

## 2. Configure MongoDB Atlas
Create a MongoDB Atlas cluster, database user, and allow your IP address.

Copy `.env.example` to `.env` and set:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/hotel_booking?retryWrites=true&w=majority
JWT_SECRET=change_this_to_a_long_random_secret
ADMIN_EMAIL=admin@hotel.com
ADMIN_PASSWORD=Admin@123
```

Razorpay is optional. For real/test payment, also set:
```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

## 3. Start backend

```bash
npm run dev
```

Backend runs at:
`http://localhost:5000`

## 4. Open frontend

Use VS Code Live Server on `frontend/index.html`, or open it directly in a browser.

The frontend expects the API at:
`http://localhost:5000/api`

## Admin
On first backend start, an admin account is created from `.env`:
- Email: `admin@hotel.com`
- Password: `Admin@123`

Change these values before using the project outside a classroom/demo environment.

## Payment
The project supports Razorpay test mode. If Razorpay keys are missing, the booking can still be created with `paymentStatus: Pending`; this is useful for development. Do not expose the Razorpay secret key in frontend code.
