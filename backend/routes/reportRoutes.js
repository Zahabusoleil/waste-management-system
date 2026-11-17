const express = require("express");
const { getReports, createReport, getReportImage, updateReport, deleteReport } = require("../controllers/reportController");
const { reportValidation, reportUpdateValidation, validateRequest } = require("../validators/reportValidator");
const { requireAuth, requireRole } = require("../middleware/auth");
const { param } = require("express-validator");
const { uploadReportImage } = require("../middleware/reportImageUpload");

const router = express.Router();

router.get("/", requireAuth, requireRole("resident", "admin"), getReports);
router.get("/:id/image", requireAuth, requireRole("resident", "admin", "collector"), param("id").isMongoId().withMessage("Invalid report ID."), validateRequest, getReportImage);
router.post("/", requireAuth, requireRole("resident"), uploadReportImage, reportValidation, createReport);
router.put("/:id", requireAuth, requireRole("resident", "admin"), uploadReportImage, param("id").isMongoId(), reportUpdateValidation, updateReport);
router.delete("/:id", requireAuth, requireRole("resident", "admin"), param("id").isMongoId().withMessage("Invalid report ID."), validateRequest, deleteReport);

module.exports = router;
