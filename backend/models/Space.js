import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Draft", "Published"],
    default: "Active"
  },
  owner_id: {
    type: String,
    required: true
  },
  // Extra fields for rich frontend support
  location: {
    type: String,
    default: ""
  },
  people: {
    type: Number,
    default: 1
  },
  area: {
    type: Number,
    default: 0
  },
  images: {
    type: [String],
    default: []
  },
  promoted: {
    type: Boolean,
    default: false
  },
  priceOverrides: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Virtual for id to match frontend mapping
spaceSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Virtuals to ensure compatibility with client components that expect title and category
spaceSchema.virtual("title").get(function () {
  return this.name;
}).set(function (val) {
  this.name = val;
});

spaceSchema.virtual("category").get(function () {
  return this.type;
}).set(function (val) {
  this.type = val;
});

spaceSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Space = mongoose.model("Space", spaceSchema);
export default Space;
