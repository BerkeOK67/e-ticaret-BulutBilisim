const express = require("express");
const { getProducts, getProductById, searchProducts } = require("../controllers/product.controller");

const router = express.Router();

// GET /api/products?page=1&limit=12
router.get("/", getProducts);

// GET /api/products/search?q=keyword
router.get("/search", searchProducts);

// GET /api/products/:id
router.get("/:id", getProductById);

module.exports = router;
