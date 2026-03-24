const ExcelJS = require("exceljs");
const { getOfficialBrandLogoBuffer } = require("../utils/officialBranding");

function normalizeText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function buildAssetDescription(asset, maxLength = 48) {
  const explicitDescription = String(asset?.catalogItem?.description || "").trim();
  if (explicitDescription) {
    const text = explicitDescription.trim();
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(1, maxLength - 1)).trim()}...`;
  }
  const parts = [String(asset?.name || "Activo").trim()];
  const brand = asset?.brand || asset?.catalogItem?.brand;
  const modelName = asset?.modelName || asset?.catalogItem?.modelName;
  if (brand) parts.push(String(brand).trim());
  if (modelName) parts.push(String(modelName).trim());
  const text = parts.filter(Boolean).join(" - ");
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(1, maxLength - 1)).trim()}...`;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0";
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

function summarizeAssets(assets) {
  const items = Array.isArray(assets) ? assets : [];
  return items.reduce(
    (acc, item) => {
      acc.totalAssets += 1;
      acc.totalUnits += Math.max(Number(item?.quantity) || 0, 1);
      acc.totalValue += Math.max(Number(item?.acquisitionValue) || 0, 0);
      acc.totalAnnualDepreciation += Math.max(Number(item?.depreciationAnnualValue) || 0, 0);
      return acc;
    },
    { totalAssets: 0, totalUnits: 0, totalValue: 0, totalAnnualDepreciation: 0 }
  );
}

function paintHeader(row, color) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD5DDE5" } },
      left: { style: "thin", color: { argb: "FFD5DDE5" } },
      bottom: { style: "thin", color: { argb: "FFD5DDE5" } },
      right: { style: "thin", color: { argb: "FFD5DDE5" } },
    };
  });
}

function paintBodyRow(row, fillColor) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
    cell.alignment = { vertical: "top", wrapText: true };
    if (fillColor) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
    }
  });
}

async function buildPlanchetaCompactExcel(assets, meta) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Plancheta Compacta");
  const normalizedAssets = Array.isArray(assets) ? assets : [];
  const summary = summarizeAssets(normalizedAssets);

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  };

  const logo = getOfficialBrandLogoBuffer();
  if (logo) {
    try {
      const imageId = workbook.addImage({ buffer: logo, extension: "png" });
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 110, height: 50 },
      });
    } catch {
      // ignore logo errors
    }
  }

  sheet.columns = [
    { width: 12 },
    { width: 30 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 8 },
    { width: 14 },
    { width: 10 },
  ];

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = "PLANCHETA COMPACTA";
  sheet.getCell("A1").font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B4332" },
  };

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value =
    "Formato sin graficos, resumido para una sola hoja de impresion";
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF475569" } };
  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  sheet.addRow([]);
  sheet.addRow(["Institucion:", meta.institution || ""]);
  sheet.addRow(["Establecimiento:", meta.establishment || ""]);
  sheet.addRow(["Sector:", meta.dependency || ""]);
  sheet.addRow(["Rango adquisicion:", meta.dateRange || "Sin filtro"]);
  sheet.addRow(["Encargado:", meta.responsibleName || "Encargado de Sector"]);
  sheet.addRow(["Jefe:", meta.chiefName || "Jefe de Sector"]);
  sheet.addRow(["Glosa:", meta.ministryText || "Resumen institucional de bienes verificados."]);
  const responsibilityRow = sheet.addRow([
    "Responsabilidad:",
    "El funcionario responsable debe velar por el buen uso, custodia y resguardo de los recursos asignados.",
  ]);
  sheet.mergeCells(`B${responsibilityRow.number}:H${responsibilityRow.number}`);
  sheet.getCell(`A${responsibilityRow.number}`).font = {
    bold: true,
    color: { argb: "FF1B4332" },
  };
  sheet.getCell(`A${responsibilityRow.number}`).alignment = {
    vertical: "middle",
  };
  sheet.getCell(`B${responsibilityRow.number}`).font = {
    italic: true,
    color: { argb: "FF475569" },
  };
  sheet.getCell(`B${responsibilityRow.number}`).alignment = {
    vertical: "middle",
    wrapText: true,
  };

  sheet.addRow([]);
  const metrics = sheet.addRow([
    `Registros: ${summary.totalAssets}`,
    `Bienes: ${summary.totalUnits}`,
    `Valor adq: ${formatCurrency(summary.totalValue)}`,
    `Deprec anual: ${formatCurrency(summary.totalAnnualDepreciation)}`,
    "",
    "",
    "",
    "",
  ]);
  metrics.font = { bold: true };
  for (let i = 1; i <= 4; i += 1) {
    const cell = metrics.getCell(i);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9DBA9D" } },
      left: { style: "thin", color: { argb: "FF9DBA9D" } },
      bottom: { style: "thin", color: { argb: "FF9DBA9D" } },
      right: { style: "thin", color: { argb: "FF9DBA9D" } },
    };
  }

  sheet.addRow([]);
  const header = sheet.addRow([
    "Codigo",
    "Bien",
    "Responsable",
    "Sector",
    "Estado",
    "Cant.",
    "Adquisicion",
    "Vida util",
  ]);
  paintHeader(header, "FF475569");

  normalizedAssets.forEach((asset, idx) => {
    const row = sheet.addRow([
      `INV-${asset.internalCode || ""}`,
      buildAssetDescription(asset, 46),
      normalizeText(asset.responsibleName, "-"),
      normalizeText(asset.dependency?.name, "-"),
      normalizeText(asset.assetState?.name, "-"),
      Number(asset.quantity || 0),
      asset.acquisitionDate ? new Date(asset.acquisitionDate) : "-",
      asset.usefulLifeYears || "-",
    ]);
    row.getCell(7).numFmt = "dd/mm/yyyy";
    row.height = 18;
    paintBodyRow(row, idx % 2 === 0 ? "FFF8FBF8" : null);
  });

  sheet.getColumn(1).alignment = { vertical: "middle" };
  sheet.getColumn(2).alignment = { vertical: "top", wrapText: true };
  sheet.getColumn(3).alignment = { vertical: "top", wrapText: true };
  sheet.getColumn(4).alignment = { vertical: "top", wrapText: true };
  sheet.getColumn(5).alignment = { vertical: "middle", wrapText: true };
  sheet.getColumn(6).alignment = { vertical: "middle" };
  sheet.getColumn(7).alignment = { vertical: "middle" };
  sheet.getColumn(8).alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: header.number }];

  return workbook;
}

module.exports = { buildPlanchetaCompactExcel };
