const mongoose = require("mongoose");
const crypto = require("crypto");

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  },
  used: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Auto-remove expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetTokenSchema.statics.createForUser = async function (userId) {
  // Invalidate any existing tokens for this user
  await this.deleteMany({ userId });
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
  await this.create({ userId, token: hashed });
  return rawToken; // Return raw (un-hashed) token to include in link
};

passwordResetTokenSchema.statics.verifyAndConsume = async function (rawToken) {
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await this.findOne({ token: hashed, used: false });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    return null;
  }
  record.used = true;
  await record.save();
  return record.userId;
};

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
