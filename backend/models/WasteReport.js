const mongoose = require("mongoose");

const wasteReportSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["Plastic", "Organic", "Paper", "Metal", "General Waste"],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    imageData: {
      type: Buffer,
      select: false,
    },
    imageContentType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp"],
      select: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Assigned", "In Progress", "Completed", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

wasteReportSchema.index({ resident: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("WasteReport", wasteReportSchema);
