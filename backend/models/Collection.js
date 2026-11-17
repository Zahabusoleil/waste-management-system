const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WasteReport",
      required: true,
      unique: true,
    },
    collector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    administrator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["assigned", "in_progress", "completed", "blocked"],
      default: "assigned",
    },
    completionDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Collection", collectionSchema);
