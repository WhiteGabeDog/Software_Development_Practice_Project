const mongoose = require("mongoose");

const CoWorkingSpaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
    unique: true,
    trim: true,
    maxlength: [50, "Name cannot be more than 50 characters"],
  },
  address: {
    type: String,
    required: [true, "Please add an address"],
  },
  tel: {
    type: String,
    required: [true, "Please add a telephone number"],
    match: [/^\d{9,10}$/, "Please enter a valid phone number"],
  },
  openTime: {
    type: String,
    required: [true, "Please add opening time"],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"]
  },
  closeTime: {
    type: String,
    required: [true, "Please add closing time"],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"]
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Example virtual populate for bookings
CoWorkingSpaceSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'coworkingSpace',
  justOne: false
});

module.exports = mongoose.model("CoWorkingSpace", CoWorkingSpaceSchema);
