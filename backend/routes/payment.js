const router = require("express").Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const { auth } = require("../middleware/auth");

router.post("/order", auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.bookingStatus === "Cancelled") return res.status(400).json({ message: "Cancelled booking cannot be paid" });

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const isDemo = !keyId || !keySecret || keyId.includes("your_") || keySecret.includes("your_") || keyId === "demo" || keySecret === "demo";

    if (isDemo) {
      return res.json({
        demoMode: true,
        orderId: "DEMO_ORDER_" + Date.now(),
        amount: Math.round(booking.totalAmount * 100),
        currency: "INR",
        keyId: "demo"
      });
    }

    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({ amount: Math.round(booking.totalAmount * 100), currency: "INR", receipt: booking.bookingId });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ message: "Could not create payment order" }); }
});

router.post("/verify", auth, async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, demoMode } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, user: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (demoMode === true || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_ID.includes("your_") || process.env.RAZORPAY_KEY_SECRET.includes("your_")) {
      booking.paymentStatus = "Paid";
      booking.paymentId = razorpay_payment_id || "DEMO_PAYMENT_" + Date.now();
      booking.bookingStatus = "Confirmed";
      await booking.save();
      return res.json({ message: "Demo payment verified and booking confirmed" });
    }

    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (expected !== razorpay_signature) return res.status(400).json({ message: "Payment verification failed" });
    booking.paymentStatus = "Paid";
    booking.paymentId = razorpay_payment_id;
    booking.bookingStatus = "Confirmed";
    await booking.save();
    res.json({ message: "Payment verified and booking confirmed" });
  } catch { res.status(500).json({ message: "Payment verification failed" }); }
});

module.exports = router;
