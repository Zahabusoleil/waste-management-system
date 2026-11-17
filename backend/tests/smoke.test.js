require("dotenv").config();
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { app } = require("../app");
const { detectImageType } = require("../middleware/reportImageUpload");

// Several smoke checks (health status and registration) depend on a live
// database connection. Connect once before the suite runs; if MongoDB is
// unavailable, those checks report failures while the DB-independent checks still pass.
test.before(async function connectTestDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ecotrack", {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    // Ignore: database-optional smoke checks will surface any failure.
  }
});

test.after(async function disconnectTestDatabase() {
  await mongoose.disconnect();
});

test("package metadata exists", () => {
  const pkg = require("../../package.json");
  assert.equal(pkg.name, "ecotrack");
});

test("report image upload accepts supported image signatures and rejects SVG", () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(
    detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png"
  );
  assert.equal(detectImageType(Buffer.from("RIFF0000WEBP")), "image/webp");
  assert.equal(detectImageType(Buffer.from("<svg></svg>")), null);
});

test("health endpoint responds", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, "ok");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("homepage includes required sections and local report action", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    for (const section of ['id="services"', 'id="how-it-works"', 'id="contact"', 'id="reportWasteLink"']) {
      assert.ok(html.includes(section), `homepage should include ${section}`);
    }
    assert.ok(html.includes('src="js/home.js"'));
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("protected dashboard pages redirect to login without a valid session", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    for (const path of ["/resident.html", "/admin.html", "/collector.html"]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" });
      assert.equal(response.status, 302, `${path} should redirect to login without a session`);
      assert.equal(response.headers.get("location"), "/login.html");
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("login creates a valid session for authenticated requests", async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const email = `session-check-${Date.now()}@example.com`;
  const password = "StrongPass123";

  try {
    const registerResponse = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session User",
        email,
        phone: "256700000123",
        location: "Kampala",
        password,
        confirmPassword: password,
      }),
    });

    assert.equal(registerResponse.status, 201, "registration should succeed");
    const cookie = registerResponse.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie, "registration should set an auth cookie");

    const meResponse = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const data = await meResponse.json();

    assert.equal(meResponse.status, 200);
    assert.equal(data.user.email, email.toLowerCase());
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("administrator APIs reject unauthenticated requests", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/stats`);
    assert.equal(response.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("API rejects cross-site state-changing requests", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(response.status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("public registration rejects privileged roles before database access", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Resident",
        email: "resident@example.com",
        phone: "123456789",
        location: "Test location",
        password: "A-strong-password",
        confirmPassword: "A-strong-password",
        role: "admin",
      }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /residents only/i);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
