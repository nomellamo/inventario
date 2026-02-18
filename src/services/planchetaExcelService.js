const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

function getLogoBuffer() {
  const envPath = process.env.PLANCHETA_LOGO_PATH;
  const fallback = path.join(__dirname, "..", "assets", "plancheta_logo.png");
  const filePath = envPath || fallback;
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch {
    return null;
  }
  return null;
}

async function buildPlanchetaExcel(assets, meta) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Plancheta");

  const logo = getLogoBuffer();
  if (logo) {
    try {
      const imageId = workbook.addImage({ buffer: logo, extension: "png" });
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 60 },
      });
    } catch {
      // ignore logo errors
    }
  }

  sheet.mergeCells("A1:P1");
  sheet.getCell("A1").value = "PLANCHETA DE INVENTARIO";
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B4332" },
  };

  sheet.addRow([]);
  sheet.addRow(["Institucion:", meta.institution || ""]);
  sheet.addRow(["Establecimiento:", meta.establishment || ""]);
  sheet.addRow(["RBD:", meta.rbd || ""]);
  sheet.addRow(["Comuna:", meta.commune || ""]);
  sheet.addRow(["Dependencia:", meta.dependency || ""]);
  sheet.addRow(["Rango adquisicion:", meta.dateRange || "Sin filtro"]);
  sheet.addRow(["Fecha:", new Date().toLocaleDateString()]);
  sheet.addRow(["Texto ministerial:", meta.ministryText || ""]);

  sheet.addRow([]);

  sheet.addRow([
    "Codigo",
    "Nombre",
    "Cantidad",
    "Marca",
    "Modelo",
    "Serie",
    "Cuenta",
    "Analitico",
    "Responsable",
    "RUT Responsable",
    "Cargo Responsable",
    "Centro de Costo",
    "Estado",
    "Tipo",
    "Dependencia",
    "Historial reciente",
  ]);

  const headerRow = sheet.getRow(sheet.lastRow.number);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2D6A4F" },
  };

  const formatMovement = (m) => {
    const typeMap = {
      INVENTORY_CHECK: "Registro inicial",
      TRANSFER: "Transferencia",
      STATUS_CHANGE: "Cambio de estado",
      RELOCATION: "Reubicación",
    };
    const typeLabel = typeMap[m.type] || m.type;
    const reason = m.reasonCode || m.reason || "sin motivo";
    const depFrom = m.fromDependency?.name || "-";
    const depTo = m.toDependency?.name || "-";
    return `${typeLabel} (${reason}) ${depFrom} -> ${depTo}`;
  };

  assets.forEach((a) => {
    const historySummary = (a.movements || []).map(formatMovement).join(" | ");

    sheet.addRow([
      a.internalCode,
      a.name,
      a.quantity ?? 1,
      a.brand || "",
      a.modelName || "",
      a.serialNumber || "",
      a.accountingAccount || "",
      a.analyticCode || "",
      a.responsibleName || "",
      a.responsibleRut || "",
      a.responsibleRole || "",
      a.costCenter || "",
      a.assetState.name,
      a.assetType.name,
      a.dependency.name,
      historySummary,
    ]);
  });

  sheet.addRow([]);
  sheet.addRow([
    "",
    "",
    "",
    "____________________",
    "",
    "",
    "",
    "",
    "____________________",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  sheet.addRow([
    "",
    "",
    "",
    meta.responsibleName || "Encargado de Dependencia",
    "",
    "",
    "",
    "",
    meta.chiefName || "Jefe de Dependencia",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  sheet.addRow([]);

  const sealStart = sheet.lastRow.number + 1;
  sheet.addRow([]);
  sheet.addRow([]);
  sheet.mergeCells(`A${sealStart}:D${sealStart + 1}`);
  sheet.getCell(`A${sealStart}`).value = "Sello establecimiento";
  sheet.getCell(`A${sealStart}`).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(`A${sealStart}`).border = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };

  const widths = [12, 26, 10, 14, 14, 14, 14, 14, 20, 16, 16, 16, 12, 12, 20, 40];
  for (let i = 1; i <= widths.length; i++) {
    const col = sheet.getColumn(i);
    col.width = widths[i - 1];
    col.alignment = { vertical: "middle", wrapText: true };
  }

  const zebraFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF7F9FC" },
  };
  const criticalFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFE5E5" },
  };
  const criticalFont = { color: { argb: "FFB00020" }, bold: true };
  const stateColIndex = 13;
  const firstDataRow = headerRow.number + 1;

  for (let rowIndex = firstDataRow; rowIndex <= sheet.lastRow.number; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
    });
    if (rowIndex % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = zebraFill;
      });
    }

    const stateCell = row.getCell(stateColIndex);
    const stateValue = String(stateCell.value || "").toUpperCase();
    if (
      stateValue.includes("BAJA") ||
      stateValue.includes("MALO") ||
      stateValue.includes("CRIT")
    ) {
      stateCell.fill = criticalFill;
      stateCell.font = criticalFont;
    }
  }

  return workbook;
}

module.exports = { buildPlanchetaExcel };
