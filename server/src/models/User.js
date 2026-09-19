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
    defaultsSeeded: { type: Boolean, default: false },

    // Subscription (Vamshi V2). Status lifecycle:
    // inactive -> pending -> active -> (expired | cancelled)
    // Expiry NEVER deletes data — the user simply drops back to read-only
    // account access and can renew later.
    subscriptionStatus: {
      type: String,
      enum: ["inactive", "pending", "active", "expired", "cancelled"],
      default: "inactive",
      index: true,
    },
    subscriptionPlanId: { type: String, default: null },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null },
    paymentCustomerId: { type: String, default: null },
    subscriptionId: { type: String, default: null },
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
    role: this.role,
    notificationsEnabled: this.notificationsEnabled,
    notificationPrefs: this.notificationPrefs,
    subscriptionStatus: this.subscriptionStatus,
    subscriptionPlanId: this.subscriptionPlanId,
    subscriptionStartDate: this.subscriptionStartDate,
    subscriptionEndDate: this.subscriptionEndDate,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);