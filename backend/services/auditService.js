const AuditLog = require("../models/AuditLog");

async function logAudit(action, performedBy, details = {}, targetType = "", targetId = "") {
  if (!performedBy) {
    return null;
  }

  try {
    return await AuditLog.create({
      action,
      performedBy,
      targetType,
      targetId,
      details,
    });
  } catch (error) {
    console.warn("Audit log failed:", error.message);
    return null;
  }
}

module.exports = { logAudit };
