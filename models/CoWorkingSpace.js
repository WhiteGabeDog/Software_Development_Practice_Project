const mongoose = require("mongoose");

// The schema for CoWorkingSpace
const CoWorkingSpaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
    unique: true,
    trim: true,
    maxlength: [50, "Name can not be more than 50 characters"],
  },
  address: {
    type: String,
    required: [true, "Please add an address"],
  },
  district: {
    type: String,
    required: [true, "Please add a district"],
  },
  province: {
    type: String,
    required: [true, "Please add a province"],
  },
  postalcode: {
    type: String,
    required: [true, "Please add a postal code"],
    maxlength: [5, "Postal Code can not be more than 5 digits"],
  },
  tel: {
    type: String,
  },
  region: {
    type: String,
    required: [true, "Please add a region"],
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Reverse populate with virtuals (e.g.
CoWorkingSpaceSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'coworkingSpace', // Adjust this field name in Booking schema
  justOne: false,
});

module.exports = mongoose.model("CoWorkingSpace", CoWorkingSpaceSchema);
