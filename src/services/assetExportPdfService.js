const PDFDocument = require("pdfkit");
const { listAssets } = require("./assetQueryService");

async function exportAssetsToPdf(query, user) {
  const { items } = await listAssets(
    { ...query, take: 10000, skip: 0 },
    user
  );

  const doc = new PDFDocument({ margin: 28, size: "A4", layout: "landscape" });

  doc
    .fontSize(14)
    .text("REPORTE DE INVENTARIO", { align: "center", underline: true });
  doc.moveDown();

  doc.fontSize(8);

  const colX = [28, 70, 210, 246, 332, 402, 476, 550, 640, 730];
  const headers = [
    "Codigo",
    "Nombre",
    "Responsable",
    "RUT",
    "Cargo",
    "Centro Costo",
    "Cant.",
    "Estado",
    "Estab.",
    "Dep.",
  ];
  const colW = [42, 136, 34, 86, 64, 64, 74, 86, 90, 68];

  doc.font("Helvetica-Bold");
  headers.forEach((t, i) => doc.text(t, colX[i], doc.y, { width: colW[i] }));
  doc.moveDown();
  doc.font("Helvetica");

  items.forEach((a) => {
    if (doc.y > 540) {
      doc.addPage();
      doc.font("Helvetica-Bold");
      headers.forEach((t, i) => doc.text(t, colX[i], doc.y, { width: colW[i] }));
      doc.moveDown();
      doc.font("Helvetica");
    }
    const y = doc.y;
    const row = [
      a.internalCode,
      a.name,
      a.responsibleName || "",
      a.responsibleRut || "",
      a.responsibleRole || "",
      a.costCenter || "",
      a.quantity ?? 1,
      a.assetState?.name || "",
      a.establishment?.name || "",
      a.dependency?.name || "",
    ];

    row.forEach((v, i) => {
      doc.text(String(v), colX[i], y, { width: colW[i], ellipsis: true });
    });
    doc.moveDown();
  });

  return doc;
}

module.exports = { exportAssetsToPdf };
