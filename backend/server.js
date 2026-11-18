require("dotenv").config();
const bcrypt = require("bcryptjs");
const { app } = require("./app");
const { connectDB } = require("./config/db");
const User = require("./models/User");

const PORT = process.env.PORT || 3000;
const DB_RETRY_INTERVAL_MS = 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured before starting EcoTrack.");
}

app.listen(PORT, () => {
  console.log(`EcoTrack server running on http://localhost:${PORT}`);
});

async function bootstrapAccounts() {
  try {
    const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "zahabusoleil01@gmail.com").trim().toLowerCase();
    const adminPass = process.env.BOOTSTRAP_ADMIN_PASSWORD || "zahabusoleil@123";
    const hashedAdminPass = await bcrypt.hash(adminPass, 10);

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: process.env.BOOTSTRAP_ADMIN_NAME || "Soleil Zahabu",
        email: adminEmail,
        phone: process.env.BOOTSTRAP_ADMIN_PHONE || "+256776291622",
        location: process.env.BOOTSTRAP_ADMIN_LOCATION || "Kampala",
        password: adminPass,
        role: "admin",
        status: "active",
      });
      console.log(`[Bootstrap] Admin account created: ${adminEmail}`);
    } else {
      await User.updateOne(
        { _id: existingAdmin._id },
        { $set: { password: hashedAdminPass, role: "admin", status: "active" } }
      );
      console.log(`[Bootstrap] Admin account synced: ${adminEmail}`);
    }

    const collectorEmail = "collector@ecotrack.ug";
    const collectorPass = "collector@123";
    const hashedCollectorPass = await bcrypt.hash(collectorPass, 10);

    const existingCollector = await User.findOne({ email: collectorEmail });
    if (!existingCollector) {
      await User.create({
        name: "David Mukasa",
        email: collectorEmail,
        phone: "+256700000001",
        location: "Kampala Central",
        password: collectorPass,
        role: "collector",
        status: "active",
      });
      console.log(`[Bootstrap] Collector account created: ${collectorEmail}`);
    } else {
      await User.updateOne(
        { _id: existingCollector._id },
        { $set: { password: hashedCollectorPass, role: "collector", status: "active" } }
      );
      console.log(`[Bootstrap] Collector account synced: ${collectorEmail}`);
    }
  } catch (err) {
    console.error("[Bootstrap] Error ensuring demo accounts:", err.message);
  }
}

async function connectToDatabase() {
  const connected = await connectDB();
  if (!connected) {
    const retry = setTimeout(connectToDatabase, DB_RETRY_INTERVAL_MS);
    retry.unref();
    return;
  }
  await bootstrapAccounts();
}

connectToDatabase();
