import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "User",
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
});

// Virtual for id to match frontend mapping if needed
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);
export default User;
