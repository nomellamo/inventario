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
  { dependencyId, establishmentId, includeHistory, fromDate, toDate },
  user
) {
  if (!dependencyId && !establishmentId) {
    throw badRequest("Debe indicar dependencyId o establishmentId");
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

    if (dependencyId) {
      const dep = await prisma.dependency.findUnique({
        where: { id: dependencyId },
        select: { establishmentId: true },
      });

      if (!dep || dep.establishmentId !== user.establishmentId) {
        throw forbidden("No autorizado para esta dependencia");
      }
    }
  }

  const where = {
    isDeleted: false,
    ...(dependencyId ? { dependencyId } : {}),
    ...(establishmentId ? { establishmentId } : {}),
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

module.exports = { getPlanchetaData };

