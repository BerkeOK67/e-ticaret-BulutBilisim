const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data ──────────────────────────────
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create admin user ────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // ─── Create regular user ──────────────────────────────
  const userPassword = await bcrypt.hash("user123", 10);
  const user = await prisma.user.create({
    data: {
      name: "Ali Veli",
      email: "ali@example.com",
      password: userPassword,
      role: "USER",
    },
  });

  console.log(`✅ Created users: ${admin.email}, ${user.email}`);

  // ─── Create products ──────────────────────────────────
  const products = await prisma.product.createMany({
    data: [
      {
        name: "Wireless Headphones",
        description: "Premium noise-cancelling wireless headphones with 30h battery life.",
        price: 299.99,
        stock: 50,
        imageUrl: "https://picsum.photos/seed/headphones/400/300",
      },
      {
        name: "Mechanical Keyboard",
        description: "TKL mechanical keyboard with RGB backlight and Cherry MX switches.",
        price: 149.99,
        stock: 30,
        imageUrl: "https://picsum.photos/seed/keyboard/400/300",
      },
      {
        name: "USB-C Hub",
        description: "7-in-1 USB-C hub with HDMI 4K, 3x USB-A, SD card reader and PD charging.",
        price: 49.99,
        stock: 100,
        imageUrl: "https://picsum.photos/seed/hub/400/300",
      },
      {
        name: "Laptop Stand",
        description: "Aluminium adjustable laptop stand compatible with 10-17 inch laptops.",
        price: 39.99,
        stock: 75,
        imageUrl: "https://picsum.photos/seed/stand/400/300",
      },
      {
        name: "Webcam 1080p",
        description: "Full HD webcam with built-in microphone and auto-focus.",
        price: 79.99,
        stock: 40,
        imageUrl: "https://picsum.photos/seed/webcam/400/300",
      },
      {
        name: "LED Desk Lamp",
        description: "Smart LED desk lamp with touch dimmer and USB charging port.",
        price: 34.99,
        stock: 60,
        imageUrl: "https://picsum.photos/seed/lamp/400/300",
      },
      {
        name: 'Gaming Mouse',
        description: "Ergonomic gaming mouse with 16000 DPI sensor and 7 programmable buttons.",
        price: 59.99,
        stock: 45,
        imageUrl: "https://picsum.photos/seed/mouse/400/300",
      },
      {
        name: "Monitor 27\" 4K",
        description: "27-inch 4K IPS monitor with 144Hz refresh rate and HDR support.",
        price: 599.99,
        stock: 20,
        imageUrl: "https://picsum.photos/seed/monitor/400/300",
      },
    ],
  });

  console.log(`✅ Created ${products.count} products`);

  console.log("\n🎉 Seed completed successfully!");
  console.log("─────────────────────────────");
  console.log("Admin → email: admin@example.com | password: admin123");
  console.log("User  → email: ali@example.com   | password: user123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
