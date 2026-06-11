const express = require("express");
const { body } = require("express-validator");
const { register, login, profile } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  register
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// GET /api/auth/profile  (protected)
router.get("/profile", authenticate, profile);

module.exports = router;
