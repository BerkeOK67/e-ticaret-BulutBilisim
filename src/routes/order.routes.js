const express = require("express");
const { createOrder, getOrders } = require("../controllers/order.controller");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// POST /api/orders  — create order from current cart
router.post("/", createOrder);

// GET /api/orders  — order history
router.get("/", getOrders);

module.exports = router;
