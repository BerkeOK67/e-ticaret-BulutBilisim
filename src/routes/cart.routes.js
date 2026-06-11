const express = require("express");
const { body } = require("express-validator");
const { getCart, addToCart, removeFromCart } = require("../controllers/cart.controller");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// GET /api/cart
router.get("/", getCart);

// POST /api/cart
router.post(
  "/",
  [
    body("productId").isInt({ min: 1 }).withMessage("Valid productId is required"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  addToCart
);

// DELETE /api/cart/:productId
router.delete("/:productId", removeFromCart);

module.exports = router;
