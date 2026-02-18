const { prisma } = require("../prisma");
const { forbidden, badRequest } = require("../utils/httpError");

function snapshotAsset(asset) {
  if (!asset) return null;
  return {
    id: asset.id,
    internalCode: asset.internalCode,
    name: asset.name,
    quantity: asset.quantity,
    brand: asset.brand,
    modelName: asset.modelName,
    serialNumber: asset.serialNumber,
    accountingAccount: asset.accountingAccount,
    analyticCode: asset.analyticCode,
    responsibleName: asset.responsibleName,
    responsibleRut: asset.responsibleRut,
    responsibleRole: asset.responsibleRole,
    costCenter: asset.costCenter,
    acquisitionValue: asset.acquisitionValue,
    acquisitionDate: asset.acquisitionDate,
    assetTypeId: asset.assetTypeId,
    assetStateId: asset.assetStateId,
    establishmentId: asset.establishmentId,
    dependencyId: asset.dependencyId,
  };
}

async function logAssetAudit({ userId, action, assetId, before, after }) {
  return prisma.assetAudit.create({
    data: {
      userId,
      action,
      assetId,
      before: before || null,
      after: after || null,
    },
  });
}

function clampTake(take) {
  return Math.min(Math.max(take || 20, 1), 100);
}

function clampSkip(skip) {
  return Math.max(skip || 0, 0);
}

async function listAssetAudits(query, user) {
  const take = clampTake(query.take);
  const skip = clampSkip(query.skip);
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  if (user.role.type === "ADMIN_ESTABLISHMENT") {
    if (!user.establishmentId) {
      throw badRequest("ADMIN_ESTABLISHMENT sin establishmentId");
    }
  }

  const where = {
    ...(query.assetId ? { assetId: query.assetId } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.action ? { action: query.action } : {}),
  };

  if (user.role.type === "ADMIN_ESTABLISHMENT") {
    where.asset = { establishmentId: user.establishmentId };
  }

  if (query.fromDate || query.toDate) {
    where.createdAt = {
      ...(query.fromDate ? { gte: query.fromDate } : {}),
      ...(query.toDate ? { lte: query.toDate } : {}),
    };
  }

  if (query.q) {
    const q = query.q.trim();
    const qNum = Number(q);
    where.OR = [
      ...(Number.isFinite(qNum) ? [{ assetId: qNum }] : []),
      { asset: { name: { contains: q, mode: "insensitive" } } },
      { asset: { internalCode: Number.isFinite(qNum) ? qNum : undefined } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const items = await prisma.assetAudit.findMany({
    where,
    orderBy: { createdAt: sortOrder },
    take,
    skip,
    include: {
      user: { select: { id: true, name: true, email: true } },
      asset: {
        select: {
          id: true,
          internalCode: true,
          name: true,
          establishmentId: true,
          dependencyId: true,
        },
      },
    },
  });

  const total = await prisma.assetAudit.count({ where });
  return { total, skip, take, items };
}

module.exports = { logAssetAudit, snapshotAsset, listAssetAudits };
