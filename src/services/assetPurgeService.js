const { prisma } = require("../prisma");
const { forbidden } = require("../utils/httpError");

function requireCentral(user) {
  if (user.role.type !== "ADMIN_CENTRAL") {
    throw forbidden("Solo ADMIN_CENTRAL puede vaciar activos fijos");
  }
}

async function purgeAssetsAndResetSequence(user) {
  requireCentral(user);

  const [assetCount, evidenceCount, movementCount, auditCount, importBatchCount, sequenceCount] =
    await Promise.all([
      prisma.asset.count(),
      prisma.assetEvidence.count(),
      prisma.movement.count(),
      prisma.assetAudit.count(),
      prisma.assetImportBatch.count(),
      prisma.assetSequence.count(),
    ]);

  await prisma.$transaction(async (tx) => {
    await tx.assetEvidence.deleteMany({});
    await tx.assetAudit.deleteMany({});
    await tx.movement.deleteMany({});
    await tx.asset.deleteMany({});
    await tx.assetImportBatch.deleteMany({});
    await tx.assetSequence.deleteMany({});

    await tx.$executeRawUnsafe('ALTER SEQUENCE "Asset_id_seq" RESTART WITH 1');
    await tx.$executeRawUnsafe('ALTER SEQUENCE "AssetEvidence_id_seq" RESTART WITH 1');
    await tx.$executeRawUnsafe('ALTER SEQUENCE "Movement_id_seq" RESTART WITH 1');
    await tx.$executeRawUnsafe('ALTER SEQUENCE "AssetAudit_id_seq" RESTART WITH 1');
    await tx.$executeRawUnsafe('ALTER SEQUENCE "AssetImportBatch_id_seq" RESTART WITH 1');
    await tx.$executeRawUnsafe('ALTER SEQUENCE "AssetSequence_id_seq" RESTART WITH 1');
  });

  return {
    purged: true,
    deletedCount: assetCount,
    deletedEvidenceCount: evidenceCount,
    deletedMovementCount: movementCount,
    deletedAuditCount: auditCount,
    deletedImportBatchCount: importBatchCount,
    deletedSequenceCount: sequenceCount,
    nextAssetId: 1,
    nextInternalCode: 1,
  };
}

module.exports = { purgeAssetsAndResetSequence };
