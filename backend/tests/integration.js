require("dotenv").config();
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

process.env.MONGODB_URI =
  process.env.ECOTRACK_TEST_MONGODB_URI ||
  "mongodb://127.0.0.1:27017/ecotrack_integration_test";
process.env.JWT_SECRET ||= "integration-test-secret-not-for-production";
process.env.FRONTEND_URL ||= "http://localhost:3000";

const { app } = require("../app");
const User = require("../models/User");
const WasteReport = require("../models/WasteReport");
const Collection = require("../models/Collection");
const AuditLog = require("../models/AuditLog");

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "successful login should set an authentication cookie");
  assert.match(setCookie, /HttpOnly/i);
  return setCookie.split(";")[0];
}

async function request(baseUrl, path, { cookie, body, method = "GET" } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, { method, headers, body });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { response, data };
}

async function runIntegration() {
  const unique = `${Date.now()}-${process.pid}`;
  const emails = {
    resident: `resident-${unique}@ecotrack-test.invalid`,
    admin: `admin-${unique}@ecotrack-test.invalid`,
    collector: `collector-${unique}@ecotrack-test.invalid`,
    otherCollector: `other-collector-${unique}@ecotrack-test.invalid`,
  };
  const createdReportIds = [];
  const createdUserIds = [];
  let server;
  let connected = false;

  try {
    const databaseName = decodeURIComponent(new URL(process.env.MONGODB_URI).pathname.slice(1));
    if (databaseName !== "ecotrack_integration_test") {
      throw new Error("Integration tests may only use the ecotrack_integration_test database.");
    }

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    const appServer = app.listen(0);
    server = appServer;
    await new Promise((resolve, reject) => {
      appServer.once("listening", resolve);
      appServer.once("error", reject);
    });
    const baseUrl = `http://127.0.0.1:${appServer.address().port}`;

    const [admin, otherCollector] = await User.create([
      {
        name: "Integration Admin",
        email: emails.admin,
        phone: "0000000000",
        location: "Test location",
        password: "integration-password-admin",
        role: "admin",
      },
      {
        name: "Other Integration Collector",
        email: emails.otherCollector,
        phone: "0000000002",
        location: "Test location",
        password: "integration-password-other",
        role: "collector",
      },
    ]);
    createdUserIds.push(admin._id, otherCollector._id);

    const registration = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        name: "Integration Resident",
        email: emails.resident,
        phone: "0000000003",
        location: "Test neighborhood",
        password: "integration-password-resident",
        confirmPassword: "integration-password-resident",
      },
    });
    assert.equal(registration.response.status, 201);
    assert.equal(registration.data.user.role, "resident");
    assert.equal("token" in registration.data, false);
    const residentCookie = sessionCookie(registration.response);

    const forbiddenAdmin = await request(baseUrl, "/api/admin/stats", {
      cookie: residentCookie,
    });
    assert.equal(forbiddenAdmin.response.status, 403);

    const form = new FormData();
    form.set("category", "Plastic");
    form.set("location", "Test neighborhood, street 1");
    form.set("description", "A test report containing plastic waste.");
    form.set(
      "image",
      new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
        type: "image/png",
      }),
      "test.png"
    );
    const created = await request(baseUrl, "/api/reports", {
      method: "POST",
      cookie: residentCookie,
      body: form,
    });
    assert.equal(created.response.status, 201);
    createdReportIds.push(created.data.report._id);
    assert.equal(created.data.report.status, "Pending");

    const updatedReport = await request(
      baseUrl,
      `/api/reports/${created.data.report._id}`,
      {
        method: "PUT",
        cookie: residentCookie,
        body: { description: "Updated test report containing plastic waste." },
      }
    );
    assert.equal(updatedReport.response.status, 200);
    assert.equal(updatedReport.data.report.description, "Updated test report containing plastic waste.");

    const imagePath = `/api/reports/${created.data.report._id}/image`;
    const image = await request(baseUrl, imagePath, { cookie: residentCookie });
    assert.equal(image.response.status, 200);
    assert.equal(image.response.headers.get("content-type"), "image/png");

    const adminLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: emails.admin, password: "integration-password-admin" },
    });
    assert.equal(adminLogin.response.status, 200);
    const adminCookie = sessionCookie(adminLogin.response);

    const collectorCreation = await request(baseUrl, "/api/admin/collectors", {
      method: "POST",
      cookie: adminCookie,
      body: {
        name: "Integration Collector",
        email: emails.collector,
        phone: "0000000001",
        location: "Test location",
        password: "integration-password-collector",
      },
    });
    assert.equal(collectorCreation.response.status, 201);
    const collector = await User.findOne({ email: emails.collector });
    assert.ok(collector);
    createdUserIds.push(collector._id);

    const approval = await request(
      baseUrl,
      `/api/admin/reports/${created.data.report._id}/status`,
      { method: "PATCH", cookie: adminCookie, body: { status: "Approved" } }
    );
    assert.equal(approval.response.status, 200);

    const assignment = await request(
      baseUrl,
      `/api/admin/reports/${created.data.report._id}/status`,
      {
        method: "PATCH",
        cookie: adminCookie,
        body: { status: "Assigned", collectorId: collector._id.toString() },
      }
    );
    assert.equal(assignment.response.status, 200);

    const collectorLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: emails.collector, password: "integration-password-collector" },
    });
    assert.equal(collectorLogin.response.status, 200);
    const collectorCookie = sessionCookie(collectorLogin.response);
    const tasks = await request(baseUrl, "/api/collector/tasks", { cookie: collectorCookie });
    assert.equal(tasks.response.status, 200);
    assert.equal(tasks.data.tasks.length, 1);
    const taskId = tasks.data.tasks[0]._id;

    const otherCollectorLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: emails.otherCollector, password: "integration-password-other" },
    });
    const otherCollectorCookie = sessionCookie(otherCollectorLogin.response);
    const deniedTask = await request(baseUrl, `/api/collector/tasks/${taskId}/status`, {
      method: "PATCH",
      cookie: otherCollectorCookie,
      body: { status: "in_progress" },
    });
    assert.equal(deniedTask.response.status, 404);

    const started = await request(baseUrl, `/api/collector/tasks/${taskId}/status`, {
      method: "PATCH",
      cookie: collectorCookie,
      body: { status: "in_progress" },
    });
    assert.equal(started.response.status, 200);
    const completed = await request(baseUrl, `/api/collector/tasks/${taskId}/status`, {
      method: "PATCH",
      cookie: collectorCookie,
      body: { status: "completed" },
    });
    assert.equal(completed.response.status, 200);

    const residentReports = await request(baseUrl, "/api/reports", { cookie: residentCookie });
    assert.equal(residentReports.response.status, 200);
    assert.equal(residentReports.data.reports[0].status, "Completed");
    assert.equal(residentReports.data.reports[0].imageContentType, "image/png");

    const secondReport = await request(baseUrl, "/api/reports", {
      method: "POST",
      cookie: residentCookie,
      body: {
        category: "Paper",
        location: "Test neighborhood, street 2",
        description: "Another pending test report for delete verification.",
      },
    });
    assert.equal(secondReport.response.status, 201);
    createdReportIds.push(secondReport.data.report._id);
    const deletion = await request(baseUrl, `/api/reports/${secondReport.data.report._id}`, {
      cookie: residentCookie,
      method: "DELETE",
    });
    assert.equal(deletion.response.status, 200);

    console.log("Integration passed: resident registration and report CRUD, image upload/access, admin role checks and collector creation, assignment, collector isolation, and completion tracking.");
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }

    if (connected) {
      const users = await User.find({ email: { $in: Object.values(emails) } }).select("_id");
      createdUserIds.push(...users.map((user) => user._id));
      const reports = await WasteReport.find({ resident: { $in: createdUserIds } }).select("_id");
      createdReportIds.push(...reports.map((report) => report._id));

      if (createdReportIds.length) {
        await Collection.deleteMany({ report: { $in: createdReportIds } });
        await WasteReport.deleteMany({ _id: { $in: createdReportIds } });
      }
      if (createdUserIds.length) {
        await AuditLog.deleteMany({ performedBy: { $in: createdUserIds } });
      }
      await User.deleteMany({ email: { $in: Object.values(emails) } });
      await mongoose.disconnect();
    }
  }
}

runIntegration().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
