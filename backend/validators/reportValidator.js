const { body, validationResult } = require("express-validator");

const reportValidation = [
  body("category").isIn(["Plastic", "Organic", "Paper", "Metal", "General Waste"]).withMessage("Invalid waste category."),
  body("location").trim().isLength({ min: 2 }).withMessage("Location is required."),
  body("description").trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters long."),
  body("imageUrl").optional({ values: "falsy" }).isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage("Image URL must be a valid HTTP or HTTPS URL."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

const reportUpdateValidation = [
  body("category").optional().isIn(["Plastic", "Organic", "Paper", "Metal", "General Waste"]).withMessage("Invalid waste category."),
  body("location").optional().trim().isLength({ min: 2, max: 200 }).withMessage("Location must be between 2 and 200 characters."),
  body("description").optional().trim().isLength({ min: 10, max: 2000 }).withMessage("Description must be between 10 and 2000 characters."),
  body("imageUrl").optional().isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage("Image URL must be a valid HTTP or HTTPS URL."),
  body().custom((value, { req }) => {
    const fields = ["category", "location", "description", "imageUrl"];
    const hasEditableFields = fields.some((field) => Object.prototype.hasOwnProperty.call(value || {}, field));
    if (!hasEditableFields && !req.file) {
      throw new Error("Provide at least one editable report field or upload a new image.");
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

module.exports = { reportValidation, reportUpdateValidation, validateRequest };
