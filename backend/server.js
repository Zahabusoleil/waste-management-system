require("dotenv").config();
const { app } = require("./app");
const { connectDB } = require("./config/db");
const PORT = process.env.PORT || 3000;
const DB_RETRY_INTERVAL_MS = 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured before starting EcoTrack.");
}

app.listen(PORT, () => {
  console.log(`EcoTrack server running on http://localhost:${PORT}`);
});

async function connectToDatabase() {
  const connected = await connectDB();
  if (!connected) {
    const retry = setTimeout(connectToDatabase, DB_RETRY_INTERVAL_MS);
    retry.unref();
  }
}

connectToDatabase();
