const ExcelJS = require("exceljs");
const { getOfficialBrandLogoBuffer } = require("../utils/officialBranding");

function normalizeText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(1, maxLength - 1)).trim()}...`;
}

function buildAssetName(asset, maxLength = 48) {
  const parts = [String(asset?.name || asset?.catalogItem?.name || "Activo").trim()];
  const brand = asset?.brand || asset?.catalogItem?.brand;
  const modelName = asset?.modelName || asset?.catalogItem?.modelName;
  if (brand) parts.push(String(brand).trim());
  if (modelName) parts.push(String(modelName).trim());
  const text = parts.filter(Boolean).join(" - ");
  return truncateText(text, maxLength);
}

function summarizeAssets(assets) {
  const items = Array.isArray(assets) ? assets : [];
  return items.reduce(
    (acc, item) => {
      acc.totalAssets += 1;
      acc.totalUnits += Math.max(Number(item?.quantity) || 0, 1);
      return acc;
    },
    { totalAssets: 0, totalUnits: 0 }
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
    { width: 34 },
    { width: 24 },
    { width: 24 },
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
  sheet.addRow([
    "Encabezado:",
    `${meta.institution || ""} | ${meta.establishment || ""} | Sector: ${meta.dependency || "Todos"}`,
  ]);
  sheet.addRow([
    "Rango:",
    `${meta.dateRange || "Sin filtro"} | ${
      meta.ministryText || "Resumen institucional de bienes verificados."
    }`,
  ]);
  sheet.addRow(["Fecha:", new Date().toLocaleDateString("es-CL")]);
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
    "",
    "",
    "",
    "",
  ]);
  metrics.font = { bold: true };
  sheet.mergeCells(`A${metrics.number}:D${metrics.number}`);
  sheet.mergeCells(`E${metrics.number}:H${metrics.number}`);
  metrics.getCell(5).value = `Bienes: ${summary.totalUnits}`;
  for (let i = 1; i <= 8; i += 1) {
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
      buildAssetName(asset, 52),
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

  sheet.addRow([]);
  const signatureTitle = sheet.addRow(["FIRMAS Y SELLO"]);
  sheet.mergeCells(`A${signatureTitle.number}:H${signatureTitle.number}`);
  signatureTitle.getCell(1).font = { bold: true, size: 14 };
  signatureTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  sheet.addRow([]);
  const signatureLine = sheet.addRow(["", "", "", "", "", "", "", ""]);
  signatureLine.height = 34;
  [
    { cell: 1, label: "Encargado del Inventario" },
    { cell: 4, label: "DAF" },
    { cell: 7, label: "Encargado del Sector" },
  ].forEach(({ cell }) => {
    const lineCell = signatureLine.getCell(cell);
    lineCell.border = { bottom: { style: "thin", color: { argb: "FF0F172A" } } };
  });
  sheet.mergeCells(`A${signatureLine.number}:C${signatureLine.number}`);
  sheet.mergeCells(`D${signatureLine.number}:F${signatureLine.number}`);
  sheet.mergeCells(`G${signatureLine.number}:H${signatureLine.number}`);
  const signatureLabels = sheet.addRow([
    "Encargado del Inventario",
    "",
    "",
    "DAF",
    "",
    "",
    "Encargado del Sector",
    "",
  ]);
  signatureLabels.font = { bold: true };
  signatureLabels.alignment = { horizontal: "center", vertical: "middle" };
  sheet.mergeCells(`A${signatureLabels.number}:C${signatureLabels.number}`);
  sheet.mergeCells(`D${signatureLabels.number}:F${signatureLabels.number}`);
  sheet.mergeCells(`G${signatureLabels.number}:H${signatureLabels.number}`);

  const signatureResponsibility = sheet.addRow([
    "Responsabilidad:",
    "El funcionario responsable debe velar por el buen uso, custodia y resguardo de los recursos asignados.",
  ]);
  sheet.mergeCells(`B${signatureResponsibility.number}:H${signatureResponsibility.number}`);
  signatureResponsibility.getCell(1).font = { bold: true, color: { argb: "FF1B4332" } };
  signatureResponsibility.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  return workbook;
}

module.exports = { buildPlanchetaCompactExcel };
