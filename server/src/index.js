import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { seed } from "./config/seed.js";
import { env } from "./config/env.js";
import { runRecurringEngine } from "./controllers/recurring.js";
import { ensureUploadDir } from "./controllers/receipts.js";

async function start() {
  await connectDb();
  await ensureUploadDir();
  await seed();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] Vamshi API listening on :${env.port}`);
  });

  // recurring engine: generate due transactions every 5 minutes + on boot
  const tick = async () => {
    try {
      const count = await runRecurringEngine();
      if (count > 0) console.log(`[recurring] generated ${count} transaction(s)`);
    } catch (err) {
      console.error("[recurring] engine error:", err.message);
    }
  };
  tick();
  setInterval(tick, 5 * 60 * 1000).unref();
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});