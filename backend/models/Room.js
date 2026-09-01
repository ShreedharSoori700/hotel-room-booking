const mongoose = require("mongoose");

const amenitySchema = {
  connectivity: [{ type: String }],
  entertainment: [{ type: String }],
  comfort: [{ type: String }],
  bathroom: [{ type: String }],
  kitchen: [{ type: String }],
  safety: [{ type: String }],
  extra: [{ type: String }]
};

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  roomType: { type: String, enum: ["Standard", "Deluxe", "Executive", "Suite"], required: true },
  price: { type: Number, required: true, min: 1 },
  capacity: { type: Number, required: true, min: 1, max: 20 },
  facilities: [{ type: String, trim: true }],
  amenities: {
    connectivity: [{ type: String }],
    entertainment: [{ type: String }],
    comfort: [{ type: String }],
    bathroom: [{ type: String }],
    kitchen: [{ type: String }],
    safety: [{ type: String }],
    extra: [{ type: String }]
  },
  bedInfo: { type: String, default: "Not specified" },
  image: { type: String, default: "" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Available", "Maintenance"], default: "Available" }
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);
