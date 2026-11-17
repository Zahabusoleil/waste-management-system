const mongoose = require("mongoose");
const WasteReport = require("../models/WasteReport");
const Collection = require("../models/Collection");
const { logAudit } = require("../services/auditService");
const { detectImageType } = require("../middleware/reportImageUpload");

const getReports = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    let query = {};
    if (req.user.role === "resident") {
      query.resident = req.user._id;
    }

    const reports = await WasteReport.find(query)
      .select("+imageContentType")
      .populate("resident", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ reports });
  } catch (error) {
    next(error);
  }
};

const createReport = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    let imageContentType;
    if (req.file) {
      imageContentType = detectImageType(req.file.buffer);
      if (!imageContentType || imageContentType !== req.file.mimetype) {
        return res.status(400).json({ message: "The uploaded file is not a valid supported image." });
      }
    }

    const report = await WasteReport.create({
      resident: req.user._id,
      category: req.body.category,
      location: req.body.location,
      description: req.body.description,
      imageData: req.file?.buffer,
      imageContentType,
      imageUrl: req.body.imageUrl || "",
      status: "Pending",
    });

    await logAudit("waste_report_created", req.user._id, { reportId: report._id.toString() }, "WasteReport", report._id.toString());

    res.status(201).json({ message: "Waste report submitted successfully.", report });
  } catch (error) {
    next(error);
  }
};

const getReportImage = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const report = await WasteReport.findById(req.params.id).select("+imageData +imageContentType");
    if (!report || !report.imageData || !report.imageContentType) {
      return res.status(404).json({ message: "Report image not found." });
    }

    if (req.user.role === "resident" && report.resident.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Report image not found." });
    }

    if (req.user.role === "collector") {
      const assignedTask = await Collection.exists({
        report: report._id,
        collector: req.user._id,
      });
      if (!assignedTask) {
        return res.status(404).json({ message: "Report image not found." });
      }
    }

    res.set({
      "Content-Type": report.imageContentType,
      "Content-Length": report.imageData.length,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.status(200).send(report.imageData);
  } catch (error) {
    return next(error);
  }
};

const updateReport = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const report = await WasteReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Waste report not found." });
    }

    if (req.user.role === "resident" && report.resident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot edit this report." });
    }

    if (req.user.role === "resident" && !["Pending", "Rejected"].includes(report.status)) {
      return res.status(403).json({ message: "This report can no longer be edited." });
    }

    if (req.file) {
      const imageContentType = detectImageType(req.file.buffer);
      if (!imageContentType || imageContentType !== req.file.mimetype) {
        return res.status(400).json({ message: "The uploaded file is not a valid supported image." });
      }
      report.imageData = req.file.buffer;
      report.imageContentType = imageContentType;
    }

    const allowedFields = ["category", "location", "description", "imageUrl"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        report[field] = req.body[field];
      }
    }

    if (req.user.role === "admin" && req.body.status) {
      report.status = req.body.status;
    }

    if (req.user.role === "resident") {
      report.status = "Pending";
    }

    await report.save();

    await logAudit("waste_report_updated", req.user._id, { reportId: report._id.toString() }, "WasteReport", report._id.toString());

    res.status(200).json({ message: "Waste report updated successfully.", report });
  } catch (error) {
    next(error);
  }
};

const deleteReport = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const report = await WasteReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Waste report not found." });
    }

    if (req.user.role === "resident" && report.resident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot delete this report." });
    }

    if (req.user.role === "resident" && !["Pending", "Rejected"].includes(report.status)) {
      return res.status(403).json({ message: "This report cannot be deleted." });
    }

    await Collection.deleteMany({ report: report._id });
    await report.deleteOne();

    await logAudit("waste_report_deleted", req.user._id, { reportId: report._id.toString() }, "WasteReport", report._id.toString());

    res.status(200).json({ message: "Waste report deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReports, createReport, getReportImage, updateReport, deleteReport };
