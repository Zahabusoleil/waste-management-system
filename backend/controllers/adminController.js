const mongoose = require("mongoose");
const User = require("../models/User");
const WasteReport = require("../models/WasteReport");
const Collection = require("../models/Collection");
const { logAudit } = require("../services/auditService");

const getUsers = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const role = req.query.role || "all";
    if (!["all", "resident", "collector", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid user role filter." });
    }
    const query = role !== "all" ? { role } : {};
    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Administrator accounts cannot be deactivated here." });
    }

    user.status = req.body.status;
    await user.save();
    await logAudit(
      "user_status_updated",
      req.user._id,
      { userId: user._id.toString(), status: user.status },
      "User",
      user._id.toString()
    );

    res.status(200).json({
      message: "User account status updated.",
      user: { id: user._id, name: user.name, role: user.role, status: user.status },
    });
  } catch (error) {
    next(error);
  }
};

const createCollector = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const { name, email, phone, location, password } = req.body;
    const existingUser = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "A collector with this email already exists." });
    }

    const collector = await User.create({
      name,
      email,
      phone,
      location,
      password,
      role: "collector",
      status: "active",
    });

    await logAudit("collector_created", req.user._id, { collectorId: collector._id.toString() }, "User", collector._id.toString());

    res.status(201).json({ message: "Collector account created successfully.", collector: { id: collector._id, name: collector.name, email: collector.email, role: collector.role } });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const [residents, collectors, reportCount, pendingReports, assignedCollections, completedCollections] = await Promise.all([
      User.countDocuments({ role: "resident" }),
      User.countDocuments({ role: "collector" }),
      WasteReport.countDocuments(),
      WasteReport.countDocuments({ status: "Pending" }),
      Collection.countDocuments({ status: "assigned" }),
      Collection.countDocuments({ status: "completed" }),
    ]);

    res.status(200).json({
      stats: {
        residents,
        collectors,
        totalReports: reportCount,
        pendingReports,
        assignedCollections,
        completedCollections,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllReports = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const reports = await WasteReport.find()
      .populate("resident", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ reports });
  } catch (error) {
    next(error);
  }
};

const getCollections = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const collections = await Collection.find()
      .populate("collector", "name email status")
      .populate("administrator", "name email")
      .populate("report", "category location description status")
      .sort({ scheduledDate: -1 });

    res.status(200).json({ collections });
  } catch (error) {
    next(error);
  }
};

const updateReportStatus = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const report = await WasteReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Waste report not found." });
    }

    const { status, collectorId, scheduledDate, notes } = req.body;
    if (status === "Assigned" && !["Approved", "Assigned"].includes(report.status)) {
      return res.status(409).json({ message: "Approve a report before assigning a collector." });
    }
    if (status !== "Assigned" && report.status !== "Pending") {
      return res.status(409).json({ message: "Only pending reports can be approved or rejected." });
    }

    if (status) {
      report.status = status;
    }

    if (status === "Assigned") {
      const collector = await User.findById(collectorId);
      if (!collector || collector.role !== "collector" || collector.status !== "active") {
        return res.status(400).json({ message: "Choose a valid collector account." });
      }

      const taskDate = scheduledDate ? new Date(scheduledDate) : new Date();
      if (Number.isNaN(taskDate.getTime())) {
        return res.status(400).json({ message: "Scheduled date is invalid." });
      }

      const collection = await Collection.findOneAndUpdate(
        { report: report._id },
        {
          report: report._id,
          collector: collector._id,
          administrator: req.user._id,
          scheduledDate: taskDate,
          status: "assigned",
          notes: notes || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await logAudit("task_assigned", req.user._id, { reportId: report._id.toString(), collectionId: collection._id.toString() }, "Collection", collection._id.toString());
    }

    await report.save();
    await logAudit("report_status_updated", req.user._id, { reportId: report._id.toString(), status: report.status }, "WasteReport", report._id.toString());

    res.status(200).json({ message: "Report status updated.", report });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "admin" && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Cannot modify another administrator's details here." });
    }

    const allowedFields = ["name", "phone", "location"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && String(req.body[field]).trim()) {
        user[field] = String(req.body[field]).trim();
      }
    }

    await user.save();
    await logAudit("user_updated", req.user._id, { userId: user._id.toString() }, "User", user._id.toString());
    res.status(200).json({ message: "User updated successfully.", user: { id: user._id, name: user.name, phone: user.phone, location: user.location, role: user.role, status: user.status } });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "admin") return res.status(403).json({ message: "Administrator accounts cannot be deleted through this interface." });

    // Remove their reports and related collections
    const WasteReport = require("../models/WasteReport");
    const Collection  = require("../models/Collection");
    const reports = await WasteReport.find({ resident: user._id }).select("_id");
    const reportIds = reports.map((r) => r._id);
    if (reportIds.length) {
      await Collection.deleteMany({ report: { $in: reportIds } });
      await WasteReport.deleteMany({ _id: { $in: reportIds } });
    }
    await Collection.deleteMany({ collector: user._id });

    await user.deleteOne();
    await logAudit("user_deleted", req.user._id, { deletedUserId: req.params.id, role: user.role }, "User", req.params.id);
    res.status(200).json({ message: "User account and associated records deleted." });
  } catch (error) {
    next(error);
  }
};

const adminResetUserPassword = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const bcrypt = require("bcryptjs");
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const whatsappNumber = (process.env.ADMIN_WHATSAPP || "+256776291622").replace(/\D/g, "");
    const waMessage = encodeURIComponent(
      `EcoTrack Password Reset\n\nHello ${user.name},\n\nYour EcoTrack account password has been reset by an administrator.\n\nEmail: ${user.email}\nNew Password: ${newPassword}\n\nPlease log in and change your password immediately.\n\nEcoTrack Support`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${waMessage}`;

    await logAudit("admin_reset_user_password", req.user._id, { targetUserId: user._id.toString(), email: user.email }, "User", user._id.toString());

    res.status(200).json({
      message: "Password reset successfully.",
      whatsappUrl,
      userPhone: user.phone,
      userName: user.name,
      userEmail: user.email,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, updateUserStatus, updateUser, deleteUser, adminResetUserPassword, createCollector, getStats, getAllReports, getCollections, updateReportStatus };
