import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  redirect: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ["Web", "App", "All"],
    default: "All",
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active",
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
});

// Virtual for id to match frontend mapping if needed
bannerSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

bannerSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Banner = mongoose.model("Banner", bannerSchema);
export default Banner;
