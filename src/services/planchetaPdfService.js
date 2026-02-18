const PDFDocument = require("pdfkit");
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

function buildPlanchetaPdf(assets, meta) {
  const doc = new PDFDocument({ margin: 28, size: "A4", layout: "landscape" });

  const logo = getLogoBuffer();
  if (logo) {
    try {
      doc.image(logo, 40, 30, { width: 80 });
    } catch {
      // ignore logo errors
    }
  }

  doc
    .fontSize(14)
    .text("PLANCHETA DE INVENTARIO", { align: "center", underline: true });

  doc.moveDown();
  doc.fontSize(10);

  doc.text(`Institucion: ${meta.institution}`);
  doc.text(`Establecimiento: ${meta.establishment}`);
  doc.text(`RBD: ${meta.rbd || ""}`);
  doc.text(`Comuna: ${meta.commune || ""}`);
  doc.text(`Dependencia: ${meta.dependency}`);
  doc.text(`Rango adquisicion: ${meta.dateRange || "Sin filtro"}`);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
  doc.moveDown(0.6);
  doc.font("Helvetica-Oblique").text(
    meta.ministryText ||
      "Certifico que el presente inventario corresponde a los bienes fisicos verificados en la dependencia indicada, en conformidad con lineamientos ministeriales vigentes."
  );

  doc.moveDown(1.5);

  const formatMovement = (m) => {
    const typeMap = {
      INVENTORY_CHECK: "Registro inicial",
      TRANSFER: "Transferencia",
      STATUS_CHANGE: "Cambio de estado",
      RELOCATION: "Reubicación",
    };
    const typeLabel = typeMap[m.type] || m.type;
    const reason = m.reasonCode || m.reason || "sin motivo";
    return `${typeLabel} (${reason})`;
  };

  const widths = [44, 130, 30, 90, 58, 58, 58, 44, 70, 150];
  const colX = [];
  let x = 28;
  widths.forEach((w, idx) => {
    colX[idx] = x;
    x += w;
  });
  const headers = [
    "Codigo",
    "Nombre",
    "Cant.",
    "Responsable",
    "RUT",
    "Cargo",
    "CC",
    "Estado",
    "Dependencia",
    "Historial reciente",
  ];
  const printHeader = () => {
    const y = doc.y;
    doc.font("Helvetica-Bold");
    headers.forEach((t, i) => doc.text(t, colX[i], y, { width: widths[i] - 4 }));
    doc.moveDown();
    doc.font("Helvetica");
  };

  printHeader();

  assets.forEach((a) => {
    if (doc.y > 520) {
      doc.addPage();
      printHeader();
    }
    const y = doc.y;

    const history = (a.movements || []).map(formatMovement).join(" | ");
    const row = [
      a.internalCode,
      a.name,
      a.quantity ?? 1,
      a.responsibleName || "",
      a.responsibleRut || "",
      a.responsibleRole || "",
      a.costCenter || "",
      a.assetState.name,
      a.dependency.name,
      history,
    ];

    row.forEach((v, i) => {
      doc.text(String(v), colX[i], y, { width: widths[i] - 4, ellipsis: true });
    });

    doc.moveDown();
  });

  doc.moveDown(2);

  const signatureLineY = doc.y + 4;
  const signatureWidth = 230;
  const leftSignatureX = 110;
  const rightSignatureX = 460;

  doc
    .moveTo(leftSignatureX, signatureLineY)
    .lineTo(leftSignatureX + signatureWidth, signatureLineY)
    .stroke();
  doc
    .moveTo(rightSignatureX, signatureLineY)
    .lineTo(rightSignatureX + signatureWidth, signatureLineY)
    .stroke();

  doc.text(meta.responsibleName || "Encargado de Dependencia", leftSignatureX, signatureLineY + 4, {
    width: signatureWidth,
    align: "center",
  });
  doc.text(meta.chiefName || "Jefe de Dependencia", rightSignatureX, signatureLineY + 4, {
    width: signatureWidth,
    align: "center",
  });
  doc.y = signatureLineY + 24;

  doc.moveDown(1.5);
  const sealY = doc.y + 10;
  doc.rect(90, sealY, 170, 70).stroke();
  doc.fontSize(9).text("Sello establecimiento", 105, sealY + 5);
  doc.fontSize(10);

  return doc;
}

module.exports = { buildPlanchetaPdf };
