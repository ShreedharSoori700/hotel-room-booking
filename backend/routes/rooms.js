const router = require("express").Router();
const Room = require("../models/Room");
const Booking = require("../models/Booking");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/", async (req, res) => {
  try { res.json(await Room.find().sort({ roomNumber: 1 })); }
  catch { res.status(500).json({ message: "Could not load rooms" }); }
});

router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { roomNumber, roomType, price, capacity, facilities, amenities, bedInfo, image, description, status } = req.body;
    if (!roomNumber || !roomType || !Number.isFinite(Number(price)) || Number(price) <= 0 || !Number.isInteger(Number(capacity)) || Number(capacity) < 1) return res.status(400).json({ message: "Valid room number, type, positive price and capacity are required" });
    const room = await Room.create({ 
      roomNumber, 
      roomType, 
      price, 
      capacity, 
      facilities: Array.isArray(facilities) ? facilities : [], 
      amenities: amenities || {},
      bedInfo: bedInfo || "Not specified",
      image: image || "", 
      description: description || "",
      status: status || "Available" 
    });
    res.status(201).json(room);
  } catch (e) { res.status(400).json({ message: e.code === 11000 ? "Room number already exists" : "Invalid room data" }); }
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch { res.status(400).json({ message: "Invalid room data" }); }
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  const active = await Booking.findOne({ room: req.params.id, bookingStatus: { $ne: "Cancelled" } });
  if (active) return res.status(400).json({ message: "Cannot delete a room with active bookings" });
  await Room.findByIdAndDelete(req.params.id);
  res.json({ message: "Room deleted" });
});

module.exports = router;
