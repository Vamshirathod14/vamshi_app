// Premium feature guard. Temporarily disabled — the app is FREE for all users
// right now (monetisation switched to ads). The check below is commented out so
// the paid plan can be re-enabled later by restoring it.
export async function requireActiveSubscription(req, res, next) {
  // const changed = syncExpiredStatus(req.user);
  // if (changed) await req.user.save();
  // if (req.user.subscriptionStatus !== "active") {
  //   return res.status(403).json({
  //     message: "An active subscription is required for this feature.",
  //     code: "SUBSCRIPTION_REQUIRED",
  //   });
  // }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Only administrators can access this.",
      code: "ADMIN_REQUIRED",
    });
  }
  next();
}