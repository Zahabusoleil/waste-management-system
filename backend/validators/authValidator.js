const { body, validationResult } = require("express-validator");

const registerValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Full name must be at least 2 characters long."),
  body("email").isEmail().withMessage("Please provide a valid email address."),
  body("phone").trim().isLength({ min: 7 }).withMessage("Phone number is required."),
  body("location").trim().isLength({ min: 2 }).withMessage("Location is required."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match.");
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

const loginValidation = [
  (req, res, next) => {
    if (typeof req.body.email === "string") {
      req.body.email = req.body.email.trim().toLowerCase();
      if (req.body.email === "zahabusoleil01@gmail") {
        req.body.email = "zahabusoleil01@gmail.com";
      }
    }
    next();
  },
  body("email").isEmail().withMessage("Please provide a valid email address."),
  body("password").notEmpty().withMessage("Password is required."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

module.exports = { registerValidation, loginValidation };
