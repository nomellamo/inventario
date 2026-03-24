// prisma/seed.js
const { prisma } = require("../src/prisma");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const adminCentralPassword = await hashPassword("admin123");
  const adminEstablishmentPassword = await hashPassword("123456789");

  // 1) Institution (Cordillera)
  const institution = await prisma.institution.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "SLEP Cordillera" },
  });

  // 2) AssetSequence (ultimo correlativo conocido)
  // Ajusta lastNumber al ultimo real (por ejemplo 95538)
  await prisma.assetSequence.upsert({
    where: { institutionId: institution.id },
    update: {},
    create: { institutionId: institution.id, lastNumber: 95538 },
  });

  // 3) AssetType
  await prisma.assetType.upsert({
    where: { name: "FIXED" },
    update: {},
    create: { name: "FIXED", minUtmValue: 3 },
  });
  await prisma.assetType.upsert({
    where: { name: "CONTROL" },
    update: {},
    create: { name: "CONTROL", minUtmValue: 0 },
  });

  // 4) AssetState
  await prisma.assetState.upsert({
    where: { name: "BUENO" },
    update: {},
    create: { name: "BUENO" },
  });
  await prisma.assetState.upsert({
    where: { name: "REGULAR" },
    update: {},
    create: { name: "REGULAR" },
  });
  await prisma.assetState.upsert({
    where: { name: "MALO" },
    update: {},
    create: { name: "MALO" },
  });
  await prisma.assetState.upsert({
    where: { name: "BAJA" },
    update: {},
    create: { name: "BAJA" },
  });

  const catalogCount = await prisma.catalogItem.count();
  if (catalogCount === 0) {
    await prisma.catalogItem.createMany({
      data: [
        { name: "Mesa redonda reuniones", category: "Mobiliario", subcategory: "Mesas" },
        { name: "Silla blanca respaldo comun", category: "Mobiliario", subcategory: "Sillas" },
        { name: "Escritorio profesor", category: "Mobiliario", subcategory: "Escritorios" },
        { name: "Pizarron magnetico", category: "Didactico", subcategory: "Pizarras" },
        { name: "Notebook", category: "TIC", subcategory: "Computacion", brand: "Lenovo" },
        { name: "Impresora", category: "TIC", subcategory: "Impresion", brand: "HP" },
        { name: "Proyector", category: "TIC", subcategory: "Audiovisual", brand: "Epson" },
        { name: "Extintor", category: "Seguridad", subcategory: "Emergencia" },
        { name: "Botiquin", category: "Salud", subcategory: "Emergencia" },
        { name: "Estante biblioteca", category: "Mobiliario", subcategory: "Estantes" }
      ],
    });
  }

  // 5) Role
  const roleCentral = await prisma.role.upsert({
    where: { type: "ADMIN_CENTRAL" },
    update: {},
    create: { type: "ADMIN_CENTRAL" },
  });
  const roleEstablishment = await prisma.role.upsert({
    where: { type: "ADMIN_ESTABLISHMENT" },
    update: {},
    create: { type: "ADMIN_ESTABLISHMENT" },
  });
  await prisma.role.upsert({
    where: { type: "VIEWER" },
    update: {},
    create: { type: "VIEWER" },
  });

  // 6) Establishment + Dependency (minimos para probar)
  const establishment = await prisma.establishment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Edificio Central San Carlos",
      type: "CENTRAL",
      institutionId: institution.id,
    },
  });

  await prisma.dependency.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Bodega Central",
      establishmentId: establishment.id,
    },
  });

  // 7) Establishment + Dependency para ADMIN_ESTABLISHMENT (id: 3)
  const establishmentSchool = await prisma.establishment.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Establecimiento 3",
      type: "SCHOOL",
      institutionId: institution.id,
    },
  });

  await prisma.dependency.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Sala 1",
      establishmentId: establishmentSchool.id,
    },
  });

  // 8) User admin central (password con hash)
  await prisma.user.upsert({
    where: { email: "admin-central@inventacore.cl" },
    update: {
      name: "Admin Central",
      password: adminCentralPassword,
      roleId: roleCentral.id,
      institutionId: institution.id,
      establishmentId: null,
      isActive: true,
    },
    create: {
      name: "Admin Central",
      email: "admin-central@inventacore.cl",
      password: adminCentralPassword,
      roleId: roleCentral.id,
      institutionId: institution.id,
      establishmentId: null,
    },
  });

  // 9) User admin establishment (password con hash)
  await prisma.user.upsert({
    where: { email: "enzo-sanchez-contreras@inventacore.cl" },
    update: {
      name: "Admin Establecimiento",
      password: adminEstablishmentPassword,
      roleId: roleEstablishment.id,
      institutionId: institution.id,
      establishmentId: establishmentSchool.id,
      isActive: true,
    },
    create: {
      name: "Admin Establecimiento",
      email: "enzo-sanchez-contreras@inventacore.cl",
      password: adminEstablishmentPassword,
      roleId: roleEstablishment.id,
      institutionId: institution.id,
      establishmentId: establishmentSchool.id,
    },
  });

  console.log(
    "Seed listo: Institution/Sequence/Types/State/Role/User/Establishment/Dependency"
  );
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
