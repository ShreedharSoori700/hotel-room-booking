require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const bookingRoutes = require("./routes/bookings");
const paymentRoutes = require("./routes/payment");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api", (req, res) => res.json({ message: "Hotel Management API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payment", paymentRoutes);

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@hotel.com").toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "Admin@123");
  let admin = await User.findOne({ email });

  if (!admin) {
    const hash = await bcrypt.hash(password, 12);
    await User.create({
      name: "Hotel Administrator",
      email,
      phone: "9999999999",
      password: hash,
      role: "admin"
    });
    console.log(`Admin created: ${email}`);
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  const needsUpdate = admin.role !== "admin" || !isPasswordValid;

  if (needsUpdate) {
    admin.name = "Hotel Administrator";
    admin.phone = "9999999999";
    admin.role = "admin";
    admin.password = await bcrypt.hash(password, 12);
    await admin.save();
    console.log(`Admin updated: ${email}`);
  }
}

async function start() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Atlas connected");
    await seedAdmin();
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start, seedAdmin };
