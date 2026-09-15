import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    currency: { type: String, default: "INR" },
    theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
    notificationsEnabled: { type: Boolean, default: true },
    notificationPrefs: {
      taskReminders: { type: Boolean, default: true },
      generalReminders: { type: Boolean, default: true },
      budgetAlerts: { type: Boolean, default: true },
      paymentAlerts: { type: Boolean, default: true },
      goalMilestones: { type: Boolean, default: true },
      summary: { type: Boolean, default: true },
    },
    pushSubscriptions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafe = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    currency: this.currency,
    theme: this.theme,
    notificationsEnabled: this.notificationsEnabled,
    notificationPrefs: this.notificationPrefs,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);