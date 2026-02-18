// scripts/createSchoolUser.js
require("dotenv").config();
const { prisma } = require("../src/prisma");

async function main() {
  // Obtener rol ADMIN_ESTABLISHMENT
 const role = await prisma.role.upsert({
  where: { type: "ADMIN_ESTABLISHMENT" },
  update: {},
  create: { type: "ADMIN_ESTABLISHMENT" },
});

  // if (!role) throw new Error("Rol ADMIN_ESTABLISHMENT no existe");

  // Crear usuario de establecimiento
  const user = await prisma.user.create({
    data: {
      name: "Admin Escuela 1",
      email: "escuela1@cordillera.local",
      password: "escuela123", // luego se hashea
      roleId: role.id,
      institutionId: 1,
      establishmentId: 1,
    },
    include: {
      role: true,
    },
  });

  console.log("Usuario escuela creado:");
  console.log({
    id: user.id,
    email: user.email,
    role: user.role.type,
    establishmentId: user.establishmentId,
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Error creando usuario escuela:", e);
  await prisma.$disconnect();
  process.exit(1);
});
