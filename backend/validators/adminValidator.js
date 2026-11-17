const { body, validationResult } = require("express-validator");

const collectorValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Collector full name is required."),
  body("email").isEmail().withMessage("Please provide a valid email address."),
  body("phone").trim().isLength({ min: 7 }).withMessage("Phone number is required."),
  body("location").trim().isLength({ min: 2 }).withMessage("Location is required."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

const accountStatusValidation = [
  body("status").isIn(["active", "inactive"]).withMessage("Invalid account status."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

const reportStatusValidation = [
  body("status")
    .isIn(["Approved", "Assigned", "Rejected"])
    .withMessage("Invalid report status."),
  body("collectorId")
    .if((value, { req }) => req.body.status === "Assigned")
    .isMongoId()
    .withMessage("A valid collector must be selected for assignment."),
  body("scheduledDate")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be a valid date."),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage("Notes must be 2000 characters or fewer."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

module.exports = { collectorValidation, accountStatusValidation, reportStatusValidation };
