const PDFDocument = require("pdfkit");

function normLabel(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function summarizeAssets(assets) {
  const items = Array.isArray(assets) ? assets : [];
  const totalAssets = items.length;
  const totalUnits = items.reduce((acc, item) => acc + Math.max(Number(item?.quantity) || 0, 1), 0);
  const totalValue = items.reduce(
    (acc, item) => acc + Math.max(Number(item?.acquisitionValue) || 0, 0),
    0
  );

  const aggregate = (picker, fallback) =>
    Array.from(
      items.reduce((map, item) => {
        const key = normLabel(picker(item), fallback);
        const units = Math.max(Number(item?.quantity) || 0, 1);
        map.set(key, (map.get(key) || 0) + units);
        return map;
      }, new Map())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

  return {
    totalAssets,
    totalUnits,
    totalValue,
    states: aggregate((item) => item?.assetState?.name, "Sin estado"),
    dependencies: aggregate((item) => item?.dependency?.name, "Sin dependencia"),
    types: aggregate((item) => item?.assetType?.name, "Sin tipo"),
    brands: aggregate((item) => item?.brand, "Sin marca"),
    responsibles: aggregate((item) => item?.responsibleName, "Sin responsable"),
  };
}

function barColor(label) {
  const normalized = String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (normalized.includes("BUENO")) return "#2D6A4F";
  if (normalized.includes("BAJA")) return "#6B7280";
  if (normalized.includes("MALO") || normalized.includes("CRIT")) return "#C1121F";
  return "#2563EB";
}

function drawMetricCard(doc, x, y, w, h, title, value, note) {
  doc.roundedRect(x, y, w, h, 10).fill("#F8FAFC").stroke("#CBD5E1");
  doc.fillColor("#475569").font("Helvetica-Bold").fontSize(9).text(title, x + 12, y + 10);
  doc.fillColor("#0F172A").fontSize(18).text(String(value), x + 12, y + 26, { width: w - 24 });
  if (note) {
    doc.fillColor("#64748B").font("Helvetica").fontSize(8).text(note, x + 12, y + h - 18, {
      width: w - 24,
    });
  }
}

function drawRankTable(doc, opts) {
  const { x, y, width, title, rows, totalUnits, coloredBars = false } = opts;
  doc.roundedRect(x, y, width, 138, 8).fill("#FFFFFF").stroke("#D7DEE7");
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9).text(title, x + 10, y + 8);
  const startY = y + 28;
  const labelW = width - 88;
  const barW = 54;
  rows.slice(0, 5).forEach(([label, count], idx) => {
    const rowY = startY + idx * 20;
    const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 1000) / 10 : 0;
    doc.fillColor("#334155").font("Helvetica").fontSize(8).text(label, x + 10, rowY, {
      width: labelW - 8,
      ellipsis: true,
    });
    doc.rect(x + labelW, rowY + 2, barW, 8).stroke("#CBD5E1");
    const fillWidth = Math.max(8, Math.round((pct / 100) * barW));
    doc.rect(x + labelW, rowY + 2, fillWidth, 8).fill(coloredBars ? barColor(label) : "#3B82F6");
    doc.fillColor("#0F172A").text(`${count} / ${pct}%`, x + labelW + barW + 4, rowY, {
      width: 34,
      align: "right",
    });
  });
}

function buildPlanchetaExecutivePdf(assets, meta) {
  const summary = summarizeAssets(assets);
  const doc = new PDFDocument({ margin: 32, size: "A4" });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(18).text("PLANCHETA GERENCIAL", left, 34);
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(
    `${meta.institution} | ${meta.establishment} | Dependencia: ${meta.dependency}`,
    left,
    58,
    { width: pageWidth }
  );
  doc.text(`Rango: ${meta.dateRange || "Sin filtro"} | Fecha: ${new Date().toLocaleDateString()}`, left, 72, {
    width: pageWidth,
  });

  const cardY = 100;
  const gap = 12;
  const cardW = (pageWidth - gap * 2) / 3;
  drawMetricCard(doc, left, cardY, cardW, 76, "Registros", summary.totalAssets, "Activos listados");
  drawMetricCard(doc, left + cardW + gap, cardY, cardW, 76, "Bienes", summary.totalUnits, "Cantidad total");
  drawMetricCard(
    doc,
    left + (cardW + gap) * 2,
    cardY,
    cardW,
    76,
    "Valor Referencial",
    `$${Math.round(summary.totalValue).toLocaleString("es-CL")}`,
    "Suma de adquisición"
  );

  const sectionY = cardY + 96;
  const colGap = 12;
  const colW = (pageWidth - colGap) / 2;
  drawRankTable(doc, {
    x: left,
    y: sectionY,
    width: colW,
    title: "Estados",
    rows: summary.states,
    totalUnits: summary.totalUnits,
    coloredBars: true,
  });
  drawRankTable(doc, {
    x: left + colW + colGap,
    y: sectionY,
    width: colW,
    title: "Dependencias",
    rows: summary.dependencies,
    totalUnits: summary.totalUnits,
  });

  const secondY = sectionY + 156;
  drawRankTable(doc, {
    x: left,
    y: secondY,
    width: colW,
    title: "Tipos de Activo",
    rows: summary.types,
    totalUnits: summary.totalUnits,
  });
  drawRankTable(doc, {
    x: left + colW + colGap,
    y: secondY,
    width: colW,
    title: "Marcas",
    rows: summary.brands,
    totalUnits: summary.totalUnits,
  });

  const thirdY = secondY + 156;
  drawRankTable(doc, {
    x: left,
    y: thirdY,
    width: pageWidth,
    title: "Responsables",
    rows: summary.responsibles,
    totalUnits: summary.totalUnits,
  });

  doc.fillColor("#64748B").font("Helvetica").fontSize(8).text(
    "Leyenda visual: verde=bueno, gris=baja, rojo=malo/critico, azul=otros.",
    left,
    doc.page.height - 42,
    { width: pageWidth, align: "center" }
  );

  return doc;
}

module.exports = { buildPlanchetaExecutivePdf };
