// scripts/checkDb.js
require("dotenv").config();
const { prisma } = require("../src/prisma");

async function main() {
  const institutions = await prisma.institution.findMany();
  console.log("Institutions:", institutions);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("DB check error:", e);
});
