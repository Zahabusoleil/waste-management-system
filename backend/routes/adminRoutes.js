const express = require("express");
const { getUsers, updateUserStatus, updateUser, deleteUser, adminResetUserPassword, createCollector, getStats, getAllReports, getCollections, updateReportStatus } = require("../controllers/adminController");
const { collectorValidation, accountStatusValidation, reportStatusValidation } = require("../validators/adminValidator");
const { requireAuth, requireRole } = require("../middleware/auth");
const { param, body } = require("express-validator");
const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

const router = express.Router();

router.get("/users", requireAuth, requireRole("admin"), getUsers);
router.patch("/users/:id/status", requireAuth, requireRole("admin"), param("id").isMongoId(), accountStatusValidation, validate, updateUserStatus);
router.patch("/users/:id", requireAuth, requireRole("admin"), param("id").isMongoId().withMessage("Invalid user ID."), validate, updateUser);
router.delete("/users/:id", requireAuth, requireRole("admin"), param("id").isMongoId().withMessage("Invalid user ID."), validate, deleteUser);
router.post("/users/:id/reset-password", requireAuth, requireRole("admin"), param("id").isMongoId().withMessage("Invalid user ID."), body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."), validate, adminResetUserPassword);
router.get("/stats", requireAuth, requireRole("admin"), getStats);
router.get("/reports", requireAuth, requireRole("admin"), getAllReports);
router.get("/collections", requireAuth, requireRole("admin"), getCollections);
router.post("/collectors", requireAuth, requireRole("admin"), collectorValidation, createCollector);
router.patch("/reports/:id/status", requireAuth, requireRole("admin"), param("id").isMongoId().withMessage("Invalid report ID."), reportStatusValidation, validate, updateReportStatus);

module.exports = router;
