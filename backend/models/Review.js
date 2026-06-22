import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  space_id: {
    type: String,
    required: true,
  },
  space_name: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "Mehmon",
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  text: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    default: () => new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" }),
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
});

reviewSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
