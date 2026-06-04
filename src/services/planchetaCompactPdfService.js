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

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(1, maxLength - 1)).trim()}...`;
}

function buildAssetName(asset, maxLength = 46) {
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
  ];
  const tableWidth = widths.reduce((acc, val) => acc + val, 0);
  doc.roundedRect(left, y, tableWidth, 18, 4).fill("#3156D4");
  headers.forEach((header, idx) => {
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.6).text(
      header,
      left + widths.slice(0, idx).reduce((acc, val) => acc + val, 0) + 6,
      y + 5,
      {
        width: widths[idx] - 12,
        align: "left",
      }
    );
  });
}

function resolveStateStyle(value) {
  const text = normalizeText(value, "-").toUpperCase();
  if (text.includes("MALO") || text.includes("CRIT")) {
    return { text, fill: "#FEE2E2", color: "#DC2626" };
  }
  if (text.includes("BUENO")) {
    return { text, fill: "#DCFCE7", color: "#16A34A" };
  }
  return { text, fill: "#E2E8F0", color: "#475569" };
}

function drawAssetRow(doc, left, widths, y, asset, idx) {
  const values = [
    `INV-${asset.internalCode || ""}`,
    buildAssetName(asset, 54),
    normalizeText(asset.responsibleName, "-"),
    normalizeText(asset.dependency?.name, "-"),
    normalizeText(asset.assetState?.name, "-"),
    String(Number(asset.quantity || 0)),
  ];
  const rowHeight = 20;
  const tableWidth = widths.reduce((acc, val) => acc + val, 0);
  doc.rect(left, y, tableWidth, rowHeight).fill(idx % 2 === 0 ? "#FFFFFF" : "#F8FBFF");
  doc.strokeColor("#E2E8F0").lineWidth(0.5).moveTo(left, y + rowHeight).lineTo(left + tableWidth, y + rowHeight).stroke();

  let cursor = left;
  values.forEach((value, valueIdx) => {
    if (valueIdx === 4) {
      const state = resolveStateStyle(value);
      const pillW = Math.min(widths[valueIdx] - 14, Math.max(38, doc.widthOfString(state.text) + 16));
      doc.roundedRect(cursor + 6, y + 4, pillW, 12, 6).fill(state.fill);
      doc.fillColor(state.color).font("Helvetica-Bold").fontSize(6.8).text(state.text, cursor + 6, y + 6, {
        width: pillW,
        align: "center",
      });
    } else {
      doc.fillColor(valueIdx === 0 ? "#1D4ED8" : "#334155").font(valueIdx === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.4).text(value, cursor + 6, y + 5, {
        width: widths[valueIdx] - 12,
        height: rowHeight - 8,
        ellipsis: true,
      });
    }
    cursor += widths[valueIdx];
  });
}

function drawScopeHeader(doc, left, y, width, meta) {
  const area = normalizeText(meta.responsibleArea, "Administracion de Activos");
  const sector = normalizeText(meta.dependency, "Todos");
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(9).text("SECTOR:", left, y, {
    width: 58,
    continued: true,
  });
  doc.fillColor("#334155").font("Helvetica").fontSize(9).text(` ${sector}`, {
    continued: false,
  });
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(9).text("AREA RESPONSABLE:", left, y + 18, {
    width: 112,
    continued: true,
  });
  doc.fillColor("#334155").font("Helvetica").fontSize(9).text(` ${area}`, {
    continued: false,
  });
  doc.strokeColor("#E2E8F0").lineWidth(0.7).moveTo(left, y + 40).lineTo(left + width, y + 40).stroke();
}

function drawSignatureCard(doc, x, y, width, height, title) {
  doc.roundedRect(x, y, width, height, 7).fill("#FFFFFF").stroke("#D8E0EA");
  const lineY = y + 36;
  const lineMargin = 16;
  doc.strokeColor("#334155")
    .lineWidth(1.15)
    .moveTo(x + lineMargin, lineY)
    .lineTo(x + width - lineMargin, lineY)
    .stroke();
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(8.8).text(title, x + 10, lineY + 11, {
    width: width - 20,
    align: "center",
  });
  doc.fillColor("#64748B").font("Helvetica").fontSize(7).text("Nombre, firma y timbre", x + 10, lineY + 26, {
    width: width - 20,
    align: "center",
  });
}

function drawSignatureSection(doc, y, left, pageWidth) {
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const requiredHeight = 164;
  let sectionY = y;
  if (sectionY + requiredHeight > pageBottom) {
    doc.addPage();
    sectionY = doc.page.margins.top + 8;
  }

  const panelX = left + 18;
  const panelW = pageWidth - 36;
  doc.roundedRect(panelX, sectionY, panelW, requiredHeight, 10).fill("#F8FAFC").stroke("#CBD5E1");
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12.5).text("FIRMAS Y SELLO", panelX, sectionY + 14, {
    width: panelW,
    align: "center",
  });
  doc.strokeColor("#94A3B8")
    .lineWidth(0.75)
    .moveTo(panelX + 34, sectionY + 38)
    .lineTo(panelX + panelW - 34, sectionY + 38)
    .stroke();

  const innerLeft = panelX + 28;
  const innerWidth = panelW - 56;
  const gap = 22;
  const cardW = (innerWidth - gap * 2) / 3;
  const cardY = sectionY + 56;
  const cardH = 70;
  drawSignatureCard(doc, innerLeft, cardY, cardW, cardH, "Encargado del Inventario");
  drawSignatureCard(doc, innerLeft + cardW + gap, cardY, cardW, cardH, "DAF");
  drawSignatureCard(doc, innerLeft + (cardW + gap) * 2, cardY, cardW, cardH, "Encargado del Sector");

  const noteX = panelX + 28;
  const noteY = sectionY + requiredHeight - 32;
  const noteW = panelW - 56;
  doc.roundedRect(noteX, noteY, noteW, 20, 5).fill("#EEF4FA").stroke("#D8E0EA");
  doc.fillColor("#475569").font("Helvetica").fontSize(7.8).text(
    "Responsabilidad: el funcionario responsable debe velar por el buen uso, custodia y resguardo de los recursos asignados.",
    noteX + 10,
    noteY + 6,
    { width: noteW - 20, align: "center" }
  );
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
  const gap = 14;
  const cardW = (pageWidth - gap) / 2;
  drawMetricCard(doc, left, cardY, cardW, 66, "Registros", summary.totalAssets, "Activos listados");
  drawMetricCard(doc, left + cardW + gap, cardY, cardW, 66, "Bienes", summary.totalUnits, "Cantidad total");

  const scopeY = cardY + 82;
  drawScopeHeader(doc, left, scopeY, pageWidth, meta);

  const tableTop = scopeY + 54;
  const widths = [66, 260, 170, 160, 96, pageWidth - 66 - 260 - 170 - 160 - 96];
  drawTableHeader(doc, left, widths, tableTop);
  let rowY = tableTop + 18;
  const pageBottom = () => doc.page.height - doc.page.margins.bottom;

  normalizedAssets.forEach((asset, idx) => {
    if (rowY + 20 > pageBottom() - 8) {
      doc.addPage();
      rowY = doc.page.margins.top;
      drawTableHeader(doc, left, widths, rowY);
      rowY += 18;
    }
    drawAssetRow(doc, left, widths, rowY, asset, idx);
    rowY += 20;
  });

  doc.fillColor("#64748B").font("Helvetica").fontSize(7.5).text(
    "Formato compacto sin graficos. Para detalle extendido usar la plancheta formal.",
    left,
    rowY + 8,
    { width: pageWidth, align: "right" }
  );

  drawSignatureSection(doc, rowY + 42, left, pageWidth);

  return doc;
}

module.exports = { buildPlanchetaCompactPdf };
