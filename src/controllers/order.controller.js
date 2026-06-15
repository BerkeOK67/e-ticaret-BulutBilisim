const prisma = require("../config/database");

// ─── Create order ─────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user's cart with products
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Check stock for all items
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${item.product.name}`,
        });
      }
    }

    const cartTotal = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    const shippingFee = cartTotal <= 300 ? 49.99 : 0;
    const grandTotal = cartTotal + shippingFee;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (Number(user.walletBalance) < grandTotal) {
      return res.status(400).json({ success: false, message: "Yetersiz bakiye. Lütfen cüzdanınıza para yükleyin." });
    }

    // Create order + items + decrement stock + deduct balance in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalPrice: grandTotal,
          shippingFee,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: { items: { include: { product: { select: { name: true } } } } },
      });

      // Decrement stock for each ordered product
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Deduct wallet balance
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: grandTotal } },
      });

      // Clear the user's cart
      await tx.cart.deleteMany({ where: { userId } });

      return newOrder;
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ─── Get order history ────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true, taxRate: true } },
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getOrders };
