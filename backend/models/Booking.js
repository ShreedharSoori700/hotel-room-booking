const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  guestName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, match: /^\d{10}$/ },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  nights: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 1 },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  paymentId: { type: String, default: "" },
  bookingStatus: { type: String, enum: ["Confirmed", "Cancelled", "Pending"], default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
