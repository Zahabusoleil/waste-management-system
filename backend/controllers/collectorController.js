const mongoose = require("mongoose");
const Collection = require("../models/Collection");
const WasteReport = require("../models/WasteReport");
const { logAudit } = require("../services/auditService");

const getAssignedTasks = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const tasks = await Collection.find({ collector: req.user._id })
      .populate({
        path: "report",
        select: "category location description status imageContentType",
        populate: { path: "resident", select: "name email" },
      })
      .populate("collector", "name email")
      .sort({ scheduledDate: 1 });

    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is unavailable. Please try again later." });
    }

    const task = await Collection.findOne({ _id: req.params.id, collector: req.user._id });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const newStatus = req.body.status;
    const validStatuses = ["assigned", "in_progress", "completed", "blocked"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid task status." });
    }

    const allowedTransitions = {
      assigned: ["in_progress"],
      in_progress: ["completed", "blocked"],
      blocked: ["in_progress"],
      completed: [],
    };
    if (!allowedTransitions[task.status].includes(newStatus)) {
      return res.status(409).json({ message: `Task cannot move from ${task.status} to ${newStatus}.` });
    }

    if (newStatus === "blocked" && !String(req.body.notes || "").trim()) {
      return res.status(400).json({ message: "A reason is required when a task is blocked." });
    }

    task.status = newStatus;
    task.notes = req.body.notes || task.notes;

    if (newStatus === "completed") {
      task.completionDate = new Date();
      await WasteReport.findByIdAndUpdate(task.report, { status: "Completed" });
    } else if (newStatus === "in_progress") {
      await WasteReport.findByIdAndUpdate(task.report, { status: "In Progress" });
    } else if (newStatus === "assigned") {
      await WasteReport.findByIdAndUpdate(task.report, { status: "Assigned" });
    } else if (newStatus === "blocked") {
      await WasteReport.findByIdAndUpdate(task.report, { status: "Assigned" });
    }

    await task.save();
    await logAudit("task_status_updated", req.user._id, { taskId: task._id.toString(), status: newStatus }, "Collection", task._id.toString());

    res.status(200).json({ message: "Task status updated successfully.", task });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAssignedTasks, updateTaskStatus };
