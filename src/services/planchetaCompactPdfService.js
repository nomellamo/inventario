const PDFDocument = require("pdfkit");
const { getOfficialBrandLogoBuffer, getOfficialBrandName } = require("../utils/officialBranding");

function normalizeText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CL");
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0";
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

function buildAssetDescription(asset, maxLength = 46) {
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

function drawMetricCard(doc, x, y, width, height, title, value, note) {
  doc.roundedRect(x, y, width, height, 9).fill("#F8FAFC").stroke("#CBD5E1");
  doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8.5).text(title, x + 10, y + 8);
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(16).text(String(value), x + 10, y + 24, {
    width: width - 20,
  });
  if (note) {
    doc.fillColor("#64748B").font("Helvetica").fontSize(7.5).text(note, x + 10, y + height - 16, {
      width: width - 20,
    });
  }
}

function drawTableHeader(doc, left, widths, y) {
  const headers = [
    "Codigo",
    "Bien",
    "Responsable",
    "Sector",
    "Estado",
    "Cant.",
    "Adquisicion",
    "Vida util",
  ];
  headers.forEach((header, idx) => {
    doc.rect(left + widths.slice(0, idx).reduce((acc, val) => acc + val, 0), y, widths[idx], 18)
      .fill("#E2E8F0")
      .stroke("#CBD5E1");
    doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(7.8).text(
      header,
      left + widths.slice(0, idx).reduce((acc, val) => acc + val, 0) + 3,
      y + 3,
      {
        width: widths[idx] - 6,
        align: "left",
      }
    );
  });
}

function drawAssetRow(doc, left, widths, y, asset, idx) {
  const values = [
    `INV-${asset.internalCode || ""}`,
    buildAssetDescription(asset, 44),
    normalizeText(asset.responsibleName, "-"),
    normalizeText(asset.dependency?.name, "-"),
    normalizeText(asset.assetState?.name, "-"),
    String(Number(asset.quantity || 0)),
    formatDate(asset.acquisitionDate),
    asset.usefulLifeYears ? String(asset.usefulLifeYears) : "-",
  ];
  const rowHeight = 18;
  let cursor = left;
  values.forEach((value, valueIdx) => {
    doc.rect(cursor, y, widths[valueIdx], rowHeight).stroke("#CBD5E1");
    if (idx % 2 === 0) {
      doc.rect(cursor, y, widths[valueIdx], rowHeight).fill("#F8FAFC");
    }
    doc.fillColor("#334155").font("Helvetica").fontSize(7.6).text(value, cursor + 3, y + 3, {
      width: widths[valueIdx] - 6,
      height: rowHeight - 6,
      ellipsis: true,
    });
    cursor += widths[valueIdx];
  });
}

function buildPlanchetaCompactPdf(assets, meta) {
  const normalizedAssets = Array.isArray(assets) ? assets : [];
  const summary = summarizeAssets(normalizedAssets);
  const doc = new PDFDocument({ margin: 22, size: "A4", layout: "landscape" });
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const logoX = left;
  const logoY = top - 2;
  const logoWidth = 70;
  let logoBottom = top;

  const logo = getOfficialBrandLogoBuffer();
  if (logo) {
    try {
      const logoImage = doc.openImage(logo);
      const logoHeight = (logoImage.height * logoWidth) / Math.max(logoImage.width, 1);
      doc.image(logoImage, logoX, logoY, { width: logoWidth });
      logoBottom = logoY + logoHeight;
    } catch {
      // ignore logo errors
    }
  }

  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(17).text(
    "PLANCHETA COMPACTA",
    left,
    top + 8,
    { width: pageWidth, align: "center" }
  );
  const titleBottom = doc.y;
  const metadataStartY = Math.max(titleBottom + 6, logoBottom + 8);

  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(
    `${meta.institution || getOfficialBrandName()} | ${meta.establishment || ""} | Sector: ${
      meta.dependency || "Todos"
    }`,
    left,
    metadataStartY,
    { width: pageWidth, align: "center" }
  );
  doc.text(
    `Rango: ${meta.dateRange || "Sin filtro"} | ${
      meta.ministryText || "Resumen de bienes verificados en el sector indicado."
    }`,
    left,
    doc.y + 2,
    { width: pageWidth, align: "center" }
  );

  const cardY = doc.y + 12;
  const gap = 10;
  const cardW = (pageWidth - gap * 3) / 4;
  drawMetricCard(doc, left, cardY, cardW, 66, "Registros", summary.totalAssets, "Activos listados");
  drawMetricCard(doc, left + cardW + gap, cardY, cardW, 66, "Bienes", summary.totalUnits, "Cantidad total");
  drawMetricCard(
    doc,
    left + (cardW + gap) * 2,
    cardY,
    cardW,
    66,
    "Valor Adq.",
    formatCurrency(summary.totalValue),
    "Suma adquisicion"
  );
  drawMetricCard(
    doc,
    left + (cardW + gap) * 3,
    cardY,
    cardW,
    66,
    "Deprec. Anual",
    formatCurrency(summary.totalAnnualDepreciation),
    "Suma anual estimada"
  );

  const tableTop = cardY + 82;
  const widths = [48, 160, 100, 104, 52, 34, 64, 46];
  doc.roundedRect(left, tableTop - 4, pageWidth, 26 + Math.min(normalizedAssets.length, 18) * 18, 8)
    .fill("#FFFFFF")
    .stroke("#CBD5E1");
  drawTableHeader(doc, left, widths, tableTop);
  let rowY = tableTop + 18;
  const pageBottom = () => doc.page.height - doc.page.margins.bottom;

  normalizedAssets.forEach((asset, idx) => {
    if (rowY + 18 > pageBottom() - 8) {
      doc.addPage();
      rowY = doc.page.margins.top;
      drawTableHeader(doc, left, widths, rowY);
      rowY += 18;
    }
    drawAssetRow(doc, left, widths, rowY, asset, idx);
    rowY += 18;
  });

  doc.fillColor("#64748B").font("Helvetica").fontSize(7.5).text(
    "Formato compacto sin graficos. Para detalle extendido usar la plancheta formal.",
    left,
    rowY + 22,
    { width: pageWidth, align: "right" }
  );

  doc.fillColor("#475569").font("Helvetica").fontSize(7.8).text(
    "Responsabilidad: el funcionario responsable debe velar por el buen uso, custodia y resguardo de los recursos asignados.",
    left,
    rowY + 8,
    { width: pageWidth - 80, align: "left" }
  );

  return doc;
}

module.exports = { buildPlanchetaCompactPdf };
