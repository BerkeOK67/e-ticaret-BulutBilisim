const { validationResult } = require("express-validator");
const prisma = require("../config/database");

// ─── Create product ───────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, price, stock, imageUrl, category, taxRate } = req.body;

    const product = await prisma.product.create({
      data: { 
        name, 
        description, 
        price: parseFloat(price), 
        stock: parseInt(stock), 
        imageUrl, 
        category,
        taxRate: taxRate !== undefined ? parseInt(taxRate) : 18
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─── Update product ───────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    const { name, description, price, stock, imageUrl, category, taxRate } = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(category !== undefined && { category }),
        ...(taxRate !== undefined && { taxRate: parseInt(taxRate) }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── Delete product ───────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await prisma.$transaction([
      prisma.cart.deleteMany({ where: { productId: id } }),
      prisma.orderItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── Get all users (admin only) ───────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, walletBalance: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

// ─── Create admin (admin only) ────────────────────────────
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "ADMIN" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
};

// ─── Delete user (admin only) ─────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if user is trying to delete themselves
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "Kendi hesabınızı silemezsiniz." });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    await prisma.$transaction(async (tx) => {
      // Siparişleri bul
      const orders = await tx.order.findMany({ where: { userId: id } });
      const orderIds = orders.map(o => o.id);
      
      if (orderIds.length > 0) {
        // Önce sipariş kalemlerini sil
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      }
      
      // Siparişleri sil
      await tx.order.deleteMany({ where: { userId: id } });
      
      // Sepet ürünlerini sil
      await tx.cart.deleteMany({ where: { userId: id } });
      
      // Son olarak kullanıcıyı sil
      await tx.user.delete({ where: { id } });
    });

    res.json({ success: true, message: "Kullanıcı başarıyla silindi" });
  } catch (err) {
    next(err);
  }
};

// ─── Get all categories (distinct values from products) ──
const getCategories = async (req, res, next) => {
  try {
    const rows = await prisma.product.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    const categories = rows.map(r => r.category).filter(Boolean);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// ─── Create category (just ensure name is valid; products can be assigned later) ─
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Kategori adı boş olamaz.' });
    }
    const trimmed = name.trim();
    // Check if already exists
    const existing = await prisma.product.findFirst({ where: { category: trimmed } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Bu kategori zaten mevcut.' });
    }
    // Categories live on products; we just confirm the name is valid and return it
    res.status(201).json({ success: true, data: trimmed });
  } catch (err) {
    next(err);
  }
};

// ─── Rename category (update all products with old name) ──
const renameCategory = async (req, res, next) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName || !newName.trim()) {
      return res.status(400).json({ success: false, message: 'Eski ve yeni kategori adı zorunludur.' });
    }
    const trimmedNew = newName.trim();
    const result = await prisma.product.updateMany({
      where: { category: oldName },
      data: { category: trimmedNew },
    });
    res.json({ success: true, message: `${result.count} ürün güncellendi.`, data: trimmedNew });
  } catch (err) {
    next(err);
  }
};

// ─── Delete category (set products' category to null or reassign) ─
const deleteCategory = async (req, res, next) => {
  try {
    const { name, reassignTo } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Kategori adı zorunludur.' });
    }
    if (reassignTo) {
      await prisma.product.updateMany({
        where: { category: name },
        data: { category: reassignTo },
      });
    } else {
      await prisma.product.updateMany({
        where: { category: name },
        data: { category: null },
      });
    }
    res.json({ success: true, message: 'Kategori silindi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createProduct, updateProduct, deleteProduct, getUsers, createAdmin, deleteUser, getCategories, createCategory, renameCategory, deleteCategory };
