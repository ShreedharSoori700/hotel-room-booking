const router = require("express").Router();
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const { auth, adminOnly } = require("../middleware/auth");

function dayStart(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

router.post("/", auth, async (req, res) => {
  try {
    const { roomId, guestName, phone, checkIn, checkOut, guests } = req.body;
    if (!roomId || !guestName || !/^[A-Za-z ]{3,80}$/.test(guestName.trim())) return res.status(400).json({ message: "Enter a valid guest name" });
    if (!/^\d{10}$/.test(phone || "")) return res.status(400).json({ message: "Phone must contain exactly 10 digits" });

    const inDate = dayStart(checkIn), outDate = dayStart(checkOut), today = dayStart(new Date());
    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) return res.status(400).json({ message: "Invalid dates" });
    if (inDate < today) return res.status(400).json({ message: "Check-in cannot be in the past" });
    if (outDate <= inDate) return res.status(400).json({ message: "Check-out must be after check-in" });

    const room = await Room.findById(roomId);
    if (!room || room.status !== "Available") return res.status(400).json({ message: "Room is not available" });
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > room.capacity) return res.status(400).json({ message: `Guests must be between 1 and ${room.capacity}` });

    const overlap = await Booking.findOne({
      room: room._id, bookingStatus: { $ne: "Cancelled" },
      checkIn: { $lt: outDate }, checkOut: { $gt: inDate }
    });
    if (overlap) return res.status(409).json({ message: "Room is already booked for these dates" });

    const nights = Math.ceil((outDate - inDate) / 86400000);
    const totalAmount = nights * room.price;
    const booking = await Booking.create({
      bookingId: "HB-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
      user: req.user.id, room: room._id, guestName: guestName.trim(), phone,
      checkIn: inDate, checkOut: outDate, guests: guestCount, nights, totalAmount,
      bookingStatus: "Confirmed"
    });
    const populated = await booking.populate("room");
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: "Booking failed" }); }
});

router.get("/mine", auth, async (req, res) => {
  res.json(await Booking.find({ user: req.user.id }).populate("room").sort({ createdAt: -1 }));
});

router.get("/", auth, adminOnly, async (req, res) => {
  res.json(await Booking.find().populate("user", "name email phone").populate("room").sort({ createdAt: -1 }));
});

router.patch("/:id/cancel", auth, async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.user) !== String(req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Not allowed" });
  if (booking.bookingStatus === "Cancelled") return res.status(400).json({ message: "Booking already cancelled" });
  booking.bookingStatus = "Cancelled";
  await booking.save();
  res.json({ message: "Booking cancelled", booking });
});

router.patch("/:id/status", auth, adminOnly, async (req, res) => {
  const allowed = ["Confirmed", "Cancelled", "Pending"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });
  const booking = await Booking.findByIdAndUpdate(req.params.id, { bookingStatus: req.body.status }, { new: true });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  res.json(booking);
});

module.exports = router;
