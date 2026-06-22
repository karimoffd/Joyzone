import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  space_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Space",
    required: true
  },
  start_date: {
    type: String,
    required: true
  },
  end_date: {
    type: String,
    required: true
  },
  total_price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Paid", "Cancelled", "booked", "closed"],
    default: "Pending"
  },
  note: {
    type: String,
    default: ""
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Virtual for id
bookingSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

bookingSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
