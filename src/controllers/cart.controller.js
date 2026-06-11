const { validationResult } = require("express-validator");
const prisma = require("../config/database");

// ─── Get cart ─────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const cartItems = await prisma.cart.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: { id: true, name: true, price: true, imageUrl: true, stock: true },
        },
      },
    });

    const total = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    res.json({ success: true, data: cartItems, total: total.toFixed(2) });
  } catch (err) {
    next(err);
  }
};

// ─── Add to cart ──────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // Check product exists and has enough stock
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    // Upsert cart item (add or increment quantity)
    const existing = await prisma.cart.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    let cartItem;
    if (existing) {
      cartItem = await prisma.cart.update({
        where: { userId_productId: { userId, productId } },
        data: { quantity: existing.quantity + quantity },
        include: { product: { select: { name: true, price: true } } },
      });
    } else {
      cartItem = await prisma.cart.create({
        data: { userId, productId, quantity },
        include: { product: { select: { name: true, price: true } } },
      });
    }

    res.status(201).json({ success: true, data: cartItem });
  } catch (err) {
    next(err);
  }
};

// ─── Remove from cart ─────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.user.id;

    const item = await prisma.cart.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    await prisma.cart.delete({
      where: { userId_productId: { userId, productId } },
    });

    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, addToCart, removeFromCart };
