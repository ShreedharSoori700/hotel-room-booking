const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/auth");

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRe = /^.{4,}$/;

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ message: "Name is required" });
    if (!emailRe.test(email || "")) return res.status(400).json({ message: "Enter a valid email" });
    if (!/^\d{10}$/.test(phone || "")) return res.status(400).json({ message: "Phone must contain exactly 10 digits" });
    if (!passwordRe.test(password || "")) return res.status(400).json({ message: "Password must be at least 4 characters" });
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), phone, password: hash });
    res.status(201).json({ message: "Registration successful", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ message: "Registration failed" }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!emailRe.test(email || "") || !password) return res.status(400).json({ message: "Valid email and password are required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid email or password" });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch { res.status(500).json({ message: "Login failed" }); }
});

router.get("/users", auth, adminOnly, async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

module.exports = router;
