const express = require("express");
const { body } = require("express-validator");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getUsers,
} = require("../controllers/admin.controller");
const { authenticate, authorizeAdmin } = require("../middlewares/auth");

const router = express.Router();

// All admin routes: must be logged in AND have ADMIN role
router.use(authenticate, authorizeAdmin);

const productValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("imageUrl").optional().isURL().withMessage("Image URL must be a valid URL"),
];

const updateProductValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("imageUrl").optional().isURL().withMessage("Image URL must be a valid URL"),
];

// GET  /api/admin/users
router.get("/users", getUsers);

// POST /api/admin/products
router.post("/products", productValidation, createProduct);

// PUT  /api/admin/products/:id
router.put("/products/:id", updateProductValidation, updateProduct);

// DELETE /api/admin/products/:id
router.delete("/products/:id", deleteProduct);

module.exports = router;
