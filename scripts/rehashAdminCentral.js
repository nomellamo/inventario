// scripts/rehashAdminCentral.js
require("dotenv").config();
const { prisma } = require("../src/prisma");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const email = "admin@cordillera.local";
  const newPassword = "admin123";

  const hashed = await hashPassword(newPassword);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
    include: { role: true },
  });

  console.log("Admin central re-hasheado:");
  console.log({ id: user.id, email: user.email, role: user.role.type });
}

main()
  .catch((e) => {
    console.error("Error re-hasheando admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
