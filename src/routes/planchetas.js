const express = require("express");
const router = express.Router();

const { getPlanchetaData } = require("../services/planchetaService");
const { buildPlanchetaExcel } = require("../services/planchetaExcelService");
const { buildPlanchetaPdf } = require("../services/planchetaPdfService");
const { parsePlanchetaFilters } = require("../utils/parsePlanchetaFilters");
const { getAssetHistory } = require("../services/assetHistoryService");
const { sendError } = require("../utils/errorResponse");

const { authJwt } = require("../middleware/authJwt");

router.use(authJwt);

function buildDateRangeLabel(filters) {
  if (!filters.fromDate && !filters.toDate) return "Sin filtro";
  if (filters.fromDate && filters.toDate) return `${filters.fromDate} a ${filters.toDate}`;
  if (filters.fromDate) return `Desde ${filters.fromDate}`;
  return `Hasta ${filters.toDate}`;
}

function buildPlanchetaSummary(assets) {
  const map = new Map();

  for (const asset of assets) {
    const dependencyId = asset?.dependency?.id || asset?.dependencyId || 0;
    const dependencyName = asset?.dependency?.name || "Sin dependencia";
    const category = asset?.catalogItem?.category || "Sin categoría";
    const productName = asset?.catalogItem?.name || asset?.name || "Sin producto";
    const brand = asset?.catalogItem?.brand || asset?.brand || "";
    const modelName = asset?.catalogItem?.modelName || asset?.modelName || "";
    const assetQuantity = Number(asset?.quantity || 1);
    const normalizedQuantity =
      Number.isFinite(assetQuantity) && assetQuantity > 0 ? assetQuantity : 1;
    const key = `${dependencyId}::${productName}::${brand}::${modelName}`;

    if (!map.has(key)) {
      map.set(key, {
        dependencyId,
        dependencyName,
        category,
        productName,
        brand,
        modelName,
        quantity: 0,
      });
    }
    map.get(key).quantity += normalizedQuantity;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.dependencyName !== b.dependencyName) {
      return String(a.dependencyName).localeCompare(String(b.dependencyName));
    }
    if (a.category !== b.category) {
      return String(a.category).localeCompare(String(b.category));
    }
    return String(a.productName).localeCompare(String(b.productName));
  });
}

// JSON
router.get("/", async (req, res, next) => {
  try {
    const filters = parsePlanchetaFilters(req.query);
    const data = await getPlanchetaData(filters, req.user);

    const first = data[0];
    const meta = first
      ? {
          institution: first.establishment.institution.name,
          establishment: first.establishment.name,
          rbd: first.establishment.rbd || "",
          commune: first.establishment.commune || "",
          dependency: filters.dependencyId ? first.dependency.name : "Todas",
          dateRange: buildDateRangeLabel(filters),
        }
      : null;

    res.json({
      count: data.length,
      meta,
      summary: buildPlanchetaSummary(data),
      items: data,
    });
  } catch (e) {
    console.error("plancheta error:", e);
    next(e);
  }
});

// EXCEL
router.get("/excel", async (req, res, next) => {
  try {
    const filters = parsePlanchetaFilters(req.query);
    const assets = await getPlanchetaData(filters, req.user);

    if (!assets.length) {
      return sendError(res, {
        status: 404,
        error: "No hay assets para exportar",
        code: "PLANCHETA_EMPTY_EXPORT",
        requestId: req.id,
      });
    }

    const meta = {
      institution: assets[0].establishment.institution.name,
      establishment: assets[0].establishment.name,
      rbd: assets[0].establishment.rbd || "",
      commune: assets[0].establishment.commune || "",
      dependency: filters.dependencyId
        ? assets[0].dependency.name
        : "Todas",
      dateRange: buildDateRangeLabel(filters),
      responsibleName: filters.responsibleName || "Encargado de Dependencia",
      chiefName: filters.chiefName || "Jefe de Dependencia",
      ministryText:
        filters.ministryText ||
        "Certifico que el presente inventario corresponde a los bienes fisicos verificados en la dependencia indicada, en conformidad con lineamientos ministeriales vigentes.",
    };

    const workbook = await buildPlanchetaExcel(assets, meta);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=plancheta_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Excel plancheta error:", e);
    next(e);
  }
});

// PDF
router.get("/pdf", async (req, res, next) => {
  try {
    const filters = parsePlanchetaFilters(req.query);
    const assets = await getPlanchetaData(filters, req.user);

    if (!assets.length) {
      return sendError(res, {
        status: 404,
        error: "No hay assets para exportar",
        code: "PLANCHETA_EMPTY_EXPORT",
        requestId: req.id,
      });
    }

    const meta = {
      institution: assets[0].establishment.institution.name,
      establishment: assets[0].establishment.name,
      rbd: assets[0].establishment.rbd || "",
      commune: assets[0].establishment.commune || "",
      dependency: filters.dependencyId
        ? assets[0].dependency.name
        : "Todas",
      dateRange: buildDateRangeLabel(filters),
      responsibleName: filters.responsibleName || "Encargado de Dependencia",
      chiefName: filters.chiefName || "Jefe de Dependencia",
      ministryText:
        filters.ministryText ||
        "Certifico que el presente inventario corresponde a los bienes fisicos verificados en la dependencia indicada, en conformidad con lineamientos ministeriales vigentes.",
    };

    const doc = buildPlanchetaPdf(assets, meta);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=plancheta_${Date.now()}.pdf`
    );

    doc.pipe(res);
    doc.end();
  } catch (e) {
    console.error("plancheta pdf error:", e);
    next(e);
  }
});
router.get("/:id/history", async (req, res, next) => {
  try {
    const assetId = Number(req.params.id);
    if (!Number.isFinite(assetId)) {
      return sendError(res, {
        status: 400,
        error: "id invalido",
        code: "INVALID_ASSET_ID",
        requestId: req.id,
      });
    }

    const history = await getAssetHistory(assetId, req.user);
    res.json({ count: history.length, items: history });
  } catch (e) {
    console.error("asset history error:", e);
    next(e);
  }
});

module.exports = { planchetasRouter: router };

