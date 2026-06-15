const { validationResult } = require("express-validator");
const prisma = require("../config/database");

// ─── Add balance to wallet ────────────────────────────────
const addBalance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
      select: { id: true, name: true, email: true, role: true, walletBalance: true, createdAt: true },
    });

    res.json({ success: true, message: "Bakiye başarıyla yüklendi", data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { addBalance };
