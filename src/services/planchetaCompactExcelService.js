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
    { width: 42 },
    { width: 28 },
    { width: 28 },
    { width: 16 },
    { width: 10 },
  ];

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "PLANCHETA COMPACTA";
  sheet.getCell("A1").font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B4332" },
  };

  sheet.mergeCells("A2:F2");
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
  sheet.mergeCells(`B${responsibilityRow.number}:F${responsibilityRow.number}`);
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
  ]);
  metrics.font = { bold: true };
  sheet.mergeCells(`A${metrics.number}:C${metrics.number}`);
  sheet.mergeCells(`D${metrics.number}:F${metrics.number}`);
  metrics.getCell(4).value = `Bienes: ${summary.totalUnits}`;
  for (let i = 1; i <= 6; i += 1) {
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
    ]);
    row.height = 18;
    paintBodyRow(row, idx % 2 === 0 ? "FFF8FBF8" : null);
  });

  sheet.getColumn(1).alignment = { vertical: "middle" };
  sheet.getColumn(2).alignment = { vertical: "top", wrapText: true };
  sheet.getColumn(3).alignment = { vertical: "top", wrapText: true };
  sheet.getColumn(4).alignment = { vertical: "top", wrapText: true };
  sheet.getColumn(5).alignment = { vertical: "middle", wrapText: true };
  sheet.getColumn(6).alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: header.number }];

  sheet.addRow([]);
  const signatureTitle = sheet.addRow(["FIRMAS Y SELLO"]);
  sheet.mergeCells(`A${signatureTitle.number}:F${signatureTitle.number}`);
  signatureTitle.height = 28;
  signatureTitle.getCell(1).font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  signatureTitle.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  signatureTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  signatureTitle.getCell(1).border = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  const signatureSpace = sheet.addRow(["", "", "", "", "", ""]);
  signatureSpace.height = 38;
  sheet.mergeCells(`A${signatureSpace.number}:F${signatureSpace.number}`);
  signatureSpace.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  signatureSpace.getCell(1).border = {
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  const signatureLine = sheet.addRow(["", "", "", "", "", ""]);
  signatureLine.height = 22;
  [
    { cell: 1 },
    { cell: 3 },
    { cell: 5 },
  ].forEach(({ cell }) => {
    const lineCell = signatureLine.getCell(cell);
    lineCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    lineCell.border = {
      bottom: { style: "medium", color: { argb: "FF334155" } },
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  sheet.mergeCells(`A${signatureLine.number}:B${signatureLine.number}`);
  sheet.mergeCells(`C${signatureLine.number}:D${signatureLine.number}`);
  sheet.mergeCells(`E${signatureLine.number}:F${signatureLine.number}`);
  const signatureLabels = sheet.addRow([
    "Encargado del Inventario",
    "",
    "DAF",
    "",
    "Encargado del Sector",
    "",
  ]);
  signatureLabels.height = 22;
  signatureLabels.font = { bold: true, color: { argb: "FF0F172A" } };
  signatureLabels.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    cell.border = {
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  signatureLabels.alignment = { horizontal: "center", vertical: "middle" };
  sheet.mergeCells(`A${signatureLabels.number}:B${signatureLabels.number}`);
  sheet.mergeCells(`C${signatureLabels.number}:D${signatureLabels.number}`);
  sheet.mergeCells(`E${signatureLabels.number}:F${signatureLabels.number}`);

  const signatureHint = sheet.addRow([
    "Nombre, firma y timbre",
    "",
    "Nombre, firma y timbre",
    "",
    "Nombre, firma y timbre",
    "",
  ]);
  signatureHint.height = 20;
  signatureHint.font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  signatureHint.alignment = { horizontal: "center", vertical: "middle" };
  signatureHint.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    cell.border = {
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  sheet.mergeCells(`A${signatureHint.number}:B${signatureHint.number}`);
  sheet.mergeCells(`C${signatureHint.number}:D${signatureHint.number}`);
  sheet.mergeCells(`E${signatureHint.number}:F${signatureHint.number}`);

  const signatureResponsibility = sheet.addRow([
    "Responsabilidad:",
    "El funcionario responsable debe velar por el buen uso, custodia y resguardo de los recursos asignados.",
  ]);
  signatureResponsibility.height = 24;
  sheet.mergeCells(`B${signatureResponsibility.number}:F${signatureResponsibility.number}`);
  signatureResponsibility.getCell(1).font = { bold: true, color: { argb: "FF1B4332" } };
  signatureResponsibility.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEEF4FA" },
  };
  signatureResponsibility.getCell(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEEF4FA" },
  };
  signatureResponsibility.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  signatureResponsibility.eachCell((cell) => {
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  return workbook;
}

module.exports = { buildPlanchetaCompactExcel };
