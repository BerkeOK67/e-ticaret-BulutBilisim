const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// ─── CORS ─────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS === "*"
  ? "*"
  : process.env.ALLOWED_ORIGINS?.split(",") || "*";

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (Frontend) ─────────────────────────────
app.use(express.static(path.join(__dirname, "../public")));

// ─── Health Check ─────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
