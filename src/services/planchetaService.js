const { prisma } = require("../prisma");
const { badRequest, forbidden } = require("../utils/httpError");

const PLANCHETA_ERROR_CODES = {
  INVALID_DATE_FORMAT: "PLANCHETA_INVALID_DATE_FORMAT",
  INVALID_DATE_RANGE: "PLANCHETA_INVALID_DATE_RANGE",
};

function parseDateStart(dateText) {
  if (!dateText) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw badRequest(
      "fromDate invalida. Formato esperado: YYYY-MM-DD",
      PLANCHETA_ERROR_CODES.INVALID_DATE_FORMAT,
      { field: "fromDate", expectedFormat: "YYYY-MM-DD" }
    );
  }
  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(
      "fromDate invalida. Formato esperado: YYYY-MM-DD",
      PLANCHETA_ERROR_CODES.INVALID_DATE_FORMAT,
      { field: "fromDate", expectedFormat: "YYYY-MM-DD" }
    );
  }
  return parsed;
}

function parseDateEnd(dateText) {
  if (!dateText) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw badRequest(
      "toDate invalida. Formato esperado: YYYY-MM-DD",
      PLANCHETA_ERROR_CODES.INVALID_DATE_FORMAT,
      { field: "toDate", expectedFormat: "YYYY-MM-DD" }
    );
  }
  const parsed = new Date(`${dateText}T23:59:59.999Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(
      "toDate invalida. Formato esperado: YYYY-MM-DD",
      PLANCHETA_ERROR_CODES.INVALID_DATE_FORMAT,
      { field: "toDate", expectedFormat: "YYYY-MM-DD" }
    );
  }
  return parsed;
}

async function getPlanchetaData(
  { dependencyId, sectorId, institutionId, establishmentId, includeHistory, fromDate, toDate },
  user
) {
  const effectiveDependencyId = dependencyId || sectorId;
  const { scopeWhere, fromDateParsed, toDateParsed } = await resolvePlanchetaScope(
    { dependencyId: effectiveDependencyId, sectorId, institutionId, establishmentId, fromDate, toDate },
    user
  );

  const where = {
    ...scopeWhere,
    isDeleted: false,
    ...((fromDateParsed || toDateParsed)
      ? {
          acquisitionDate: {
            ...(fromDateParsed ? { gte: fromDateParsed } : {}),
            ...(toDateParsed ? { lte: toDateParsed } : {}),
          },
        }
      : {}),
  };

  const assets = await prisma.asset.findMany({
    where,
    orderBy: [{ dependencyId: "asc" }, { internalCode: "asc" }],
    include: {
      assetState: true,
      assetType: true,
      catalogItem: {
        select: {
          id: true,
          name: true,
          category: true,
          subcategory: true,
          brand: true,
          modelName: true,
          description: true,
        },
      },
      dependency: true,
      establishment: { include: { institution: true } },
      ...(includeHistory
        ? {
            movements: {
              orderBy: { createdAt: "desc" },
              take: 5,
              select: {
                id: true,
                type: true,
                reasonCode: true,
                reason: true,
                createdAt: true,
                user: { select: { id: true, name: true } },
                fromDependency: { select: { id: true, name: true } },
                toDependency: { select: { id: true, name: true } },
              },
            },
          }
        : {}),
    },
  });

  return assets;
}

async function resolvePlanchetaScope(
  { dependencyId, sectorId, institutionId, establishmentId, fromDate, toDate },
  user
) {
  const effectiveDependencyId = dependencyId || sectorId;
  let effectiveEstablishmentId = establishmentId;
  if (!effectiveDependencyId && !establishmentId && !institutionId) {
    throw badRequest("Debe indicar institutionId, sectorId/dependencyId o establishmentId");
  }

  const fromDateParsed = parseDateStart(fromDate);
  const toDateParsed = parseDateEnd(toDate);
  if (fromDateParsed && toDateParsed && fromDateParsed > toDateParsed) {
    throw badRequest(
      "Rango de fechas invalido: fromDate no puede ser mayor que toDate",
      PLANCHETA_ERROR_CODES.INVALID_DATE_RANGE,
      { fromDate, toDate }
    );
  }

  if (user.role.type === "ADMIN_ESTABLISHMENT") {
    if (establishmentId && establishmentId !== user.establishmentId) {
      throw forbidden("No autorizado para este establecimiento");
    }
    if (institutionId && user.institutionId && institutionId !== user.institutionId) {
      throw forbidden("No autorizado para esta institucion");
    }
    effectiveEstablishmentId = user.establishmentId;

    if (effectiveDependencyId) {
      const dep = await prisma.dependency.findUnique({
        where: { id: effectiveDependencyId },
        select: { establishmentId: true },
      });

      if (!dep || dep.establishmentId !== user.establishmentId) {
        throw forbidden("No autorizado para este sector");
      }
    }
  }

  return {
    scopeWhere: {
      ...(effectiveDependencyId ? { dependencyId: effectiveDependencyId } : {}),
      ...(effectiveEstablishmentId ? { establishmentId: effectiveEstablishmentId } : {}),
      ...(institutionId && !effectiveEstablishmentId ? { establishment: { institutionId } } : {}),
    },
    fromDateParsed,
    toDateParsed,
  };
}

function buildPlanchetaRecommendations(activeAssets, deletedAssets) {
  const activeItems = Array.isArray(activeAssets) ? activeAssets : [];
  const deletedItems = Array.isArray(deletedAssets) ? deletedAssets : [];
  const totalUnits = activeItems.reduce(
    (acc, item) => acc + Math.max(Number(item?.quantity) || 0, 1),
    0
  );
  const deletedMonthUnits = deletedItems.reduce(
    (acc, item) => acc + Math.max(Number(item?.quantity) || 0, 1),
    0
  );
  const withoutResponsible = activeItems.filter(
    (item) => !String(item?.responsibleName || "").trim()
  ).length;
  const reviewStates = activeItems.filter((item) => {
    const state = String(item?.assetState?.name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    return state.includes("MALO") || state.includes("CRIT");
  }).length;
  const healthyStates = activeItems.filter((item) => {
    const state = String(item?.assetState?.name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    return state.includes("BUENO");
  }).length;

  const change = [];
  const keep = [];

  if (deletedMonthUnits >= Math.max(3, Math.ceil(totalUnits * 0.1))) {
    change.push(
      "Aumentaron las bajas del ultimo mes. Conviene revisar reposicion, mantencion y causas de salida."
    );
  } else if (deletedMonthUnits > 0) {
    change.push(
      "Hubo bajas recientes. Revisa si corresponde reemplazar equipos o ajustar la asignacion de activos."
    );
  }
  if (reviewStates > 0) {
    change.push(
      `Hay ${reviewStates} activos en estado malo/critico. Prioriza reparacion, baja o reemplazo.`
    );
  }
  if (withoutResponsible > 0) {
    change.push(
      `Hay ${withoutResponsible} activos sin responsable. Regulariza la custodia y firma de sector.`
    );
  }
  if (!change.length) {
    change.push("No se detectan cambios urgentes. Mantener monitoreo semanal del inventario.");
  }

  if (healthyStates >= Math.max(1, Math.ceil(activeItems.length * 0.6))) {
    keep.push("La mayoria del inventario sigue en buen estado. Mantener el plan actual de uso y control.");
  }
  if (!deletedMonthUnits) {
    keep.push("No hay bajas registradas en los ultimos 30 dias. Mantener el esquema actual de resguardo.");
  }
  if (!withoutResponsible) {
    keep.push("La custodia esta completa en la muestra actual. Mantener la asignacion formal vigente.");
  }
  if (!keep.length) {
    keep.push("Mantener seguimiento de responsables, estados y bajas para validar estabilidad operacional.");
  }

  return { change, keep, withoutResponsible, reviewStates, healthyStates, totalUnits };
}

async function getPlanchetaInsights(filters, user, activeAssets = []) {
  const { scopeWhere } = await resolvePlanchetaScope(filters, user);
  const now = new Date();
  const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthlyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deletedAssets = await prisma.asset.findMany({
    where: {
      ...scopeWhere,
      isDeleted: true,
      deletedAt: { gte: monthlyStart },
    },
    orderBy: { deletedAt: "desc" },
    select: {
      id: true,
      name: true,
      internalCode: true,
      quantity: true,
      deletedAt: true,
      responsibleName: true,
      dependency: { select: { id: true, name: true } },
      catalogItem: { select: { category: true } },
      assetState: { select: { name: true } },
    },
  });
  const deletedScopedAssets = await prisma.asset.findMany({
    where: {
      ...scopeWhere,
      isDeleted: true,
    },
    select: {
      id: true,
      quantity: true,
      assetState: { select: { name: true } },
    },
  });

  const monthlyItems = deletedAssets;
  const weeklyItems = deletedAssets.filter((item) => item.deletedAt && item.deletedAt >= weeklyStart);
  const toUnits = (items) =>
    items.reduce((acc, item) => acc + Math.max(Number(item?.quantity) || 0, 1), 0);

  const monthlyByCategory = Array.from(
    monthlyItems.reduce((map, item) => {
      const key =
        String(item?.catalogItem?.category || "Sin categoria").trim() || "Sin categoria";
      map.set(key, (map.get(key) || 0) + Math.max(Number(item?.quantity) || 0, 1));
      return map;
    }, new Map())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const recommendations = buildPlanchetaRecommendations(activeAssets, monthlyItems);
  const stateOverview = Array.from(
    [...(Array.isArray(activeAssets) ? activeAssets : []), ...deletedScopedAssets].reduce((map, item) => {
      const stateName = String(item?.assetState?.name || "Sin estado").trim() || "Sin estado";
      const units = Math.max(Number(item?.quantity) || 0, 1);
      map.set(stateName, (map.get(stateName) || 0) + units);
      return map;
    }, new Map())
  )
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    weekly: {
      count: weeklyItems.length,
      units: toUnits(weeklyItems),
      items: weeklyItems.slice(0, 5).map((item) => ({
        id: item.id,
        internalCode: item.internalCode,
        name: item.name,
        quantity: Math.max(Number(item?.quantity) || 0, 1),
        deletedAt: item.deletedAt,
        dependencyName: item?.dependency?.name || "Sin sector",
      })),
    },
    monthly: {
      count: monthlyItems.length,
      units: toUnits(monthlyItems),
      items: monthlyItems.slice(0, 8).map((item) => ({
        id: item.id,
        internalCode: item.internalCode,
        name: item.name,
        quantity: Math.max(Number(item?.quantity) || 0, 1),
        deletedAt: item.deletedAt,
        dependencyName: item?.dependency?.name || "Sin sector",
      })),
      byCategory: monthlyByCategory,
    },
    stateOverview,
    recommendations,
  };
}

module.exports = { getPlanchetaData, getPlanchetaInsights };

