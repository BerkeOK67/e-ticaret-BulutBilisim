const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

// Graceful shutdown — close Prisma connection on exit
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
