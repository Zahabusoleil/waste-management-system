const express = require("express");
const { getAssignedTasks, updateTaskStatus } = require("../controllers/collectorController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");

const router = express.Router();

router.get("/tasks", requireAuth, requireRole("collector"), getAssignedTasks);
router.patch(
  "/tasks/:id/status",
  requireAuth,
  requireRole("collector"),
  param("id").isMongoId().withMessage("Invalid task ID."),
  body("status").isIn(["assigned", "in_progress", "completed", "blocked"]),
  body("notes").optional().isString().isLength({ max: 2000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
  updateTaskStatus
);

module.exports = router;
