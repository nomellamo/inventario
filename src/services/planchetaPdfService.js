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

function normalizeStateName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getStateColor(stateName) {
  const normalized = normalizeStateName(stateName);
  if (normalized.includes("BUENO")) {
    return { fill: "#4C956C", text: "#163020" };
  }
  if (normalized.includes("BAJA")) {
    return { fill: "#6B7280", text: "#1F2937" };
  }
  if (normalized.includes("MALO") || normalized.includes("CRIT")) {
    return { fill: "#C1121F", text: "#5F0F16" };
  }
  return { fill: "#3B82F6", text: "#1E3A8A" };
}

function truncateVisualText(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!Number.isFinite(maxLength) || maxLength <= 0 || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 1)).trim()}...`;
}

function buildAssetDescription(asset, maxLength = 90) {
  const explicitDescription = String(asset?.catalogItem?.description || "").trim();
  if (explicitDescription) return truncateVisualText(explicitDescription, maxLength);
  const main = String(asset?.name || "Activo").trim();
  const extras = [];
  const brand = asset?.brand || asset?.catalogItem?.brand;
  const modelName = asset?.modelName || asset?.catalogItem?.modelName;
  if (brand) extras.push(String(brand).trim());
  if (modelName) extras.push(String(modelName).trim());
  if (asset?.serialNumber) extras.push(`Serie ${String(asset.serialNumber).trim()}`);
  const detail = extras.filter(Boolean).join(" / ");
  return truncateVisualText(detail ? `${main} - ${detail}` : main, maxLength);
}

function buildPlanchetaPdf(assets, meta) {
  const doc = new PDFDocument({ margin: 28, size: "A4", layout: "landscape" });
  const pageBottom = () => doc.page.height - doc.page.margins.bottom;
  const tableLeft = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const normalizedAssets = Array.isArray(assets) ? assets : [];
  const totalAssets = normalizedAssets.length;
  const totalUnits = normalizedAssets.reduce(
    (acc, item) => acc + Math.max(Number(item?.quantity) || 0, 1),
    0
  );
  const stateStats = Array.from(
    normalizedAssets.reduce((map, item) => {
      const stateName = String(item?.assetState?.name || "Sin estado").trim() || "Sin estado";
      const units = Math.max(Number(item?.quantity) || 0, 1);
      map.set(stateName, (map.get(stateName) || 0) + units);
      return map;
    }, new Map())
  ).sort((a, b) => b[1] - a[1]);
  const dependencyStats = Array.from(
    normalizedAssets.reduce((map, item) => {
      const dependencyName = String(item?.dependency?.name || "Sin dependencia").trim() || "Sin dependencia";
      const units = Math.max(Number(item?.quantity) || 0, 1);
      map.set(dependencyName, (map.get(dependencyName) || 0) + units);
      return map;
    }, new Map())
  ).sort((a, b) => b[1] - a[1]);
  const typeStats = Array.from(
    normalizedAssets.reduce((map, item) => {
      const typeName = String(item?.assetType?.name || "Sin tipo").trim() || "Sin tipo";
      const units = Math.max(Number(item?.quantity) || 0, 1);
      map.set(typeName, (map.get(typeName) || 0) + units);
      return map;
    }, new Map())
  ).sort((a, b) => b[1] - a[1]);
  const brandStats = Array.from(
    normalizedAssets.reduce((map, item) => {
      const brandName = String(item?.brand || "Sin marca").trim() || "Sin marca";
      const units = Math.max(Number(item?.quantity) || 0, 1);
      map.set(brandName, (map.get(brandName) || 0) + units);
      return map;
    }, new Map())
  ).sort((a, b) => b[1] - a[1]);
  const responsibleStats = Array.from(
    normalizedAssets.reduce((map, item) => {
      const responsibleName =
        String(item?.responsibleName || "Sin responsable").trim() || "Sin responsable";
      const units = Math.max(Number(item?.quantity) || 0, 1);
      map.set(responsibleName, (map.get(responsibleName) || 0) + units);
      return map;
    }, new Map())
  ).sort((a, b) => b[1] - a[1]);

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
    meta.ministryText || "Resumen de bienes verificados en la dependencia indicada."
  );

  doc.moveDown(1.5);

  const widths = [54, 188, 124, 82, 90, 104];
  const colX = [];
  let x = tableLeft;
  widths.forEach((w, idx) => {
    colX[idx] = x;
    x += w;
  });
  const headers = [
    "Codigo",
    "Descripcion del Bien",
    "Responsable",
    "RUT",
    "Estado",
    "Dependencia",
  ];
  const printHeader = () => {
    const y = doc.y;
    const headerPadding = 4;
    doc.font("Helvetica-Bold");
    doc.fontSize(8.5);
    const headerHeights = headers.map((t, i) =>
      doc.heightOfString(String(t), { width: widths[i] - headerPadding * 2 })
    );
    const headerHeight = Math.max(
      18,
      ...headerHeights.map((height) => height + headerPadding * 2)
    );
    doc.rect(tableLeft, y, tableWidth, headerHeight).fill("#E9EFF6");
    headers.forEach((t, i) => {
      doc.rect(colX[i], y, widths[i], headerHeight).stroke("#AAB7C4");
      doc.fillColor("#14213D").text(t, colX[i] + headerPadding, y + headerPadding, {
        width: widths[i] - headerPadding * 2,
        height: headerHeight - headerPadding * 2,
      });
    });
    doc.fillColor("black");
    doc.y = y + headerHeight + 4;
    doc.font("Helvetica");
    doc.fontSize(7.8);
  };

  printHeader();

  normalizedAssets.forEach((a, index) => {
    const row = [
      `INV-${a.internalCode}`,
      buildAssetDescription(a, 88),
      a.responsibleName || "",
      a.responsibleRut || "",
      a.assetState?.name || "",
      a.dependency?.name || "",
    ];
    const cellPadding = 4;
    const maxRowHeight = 68;
    const rowHeight = Math.min(
      maxRowHeight,
      Math.max(18, ...row.map((v, i) => doc.heightOfString(String(v ?? ""), {
        width: widths[i] - cellPadding * 2,
      }) + cellPadding * 2))
    );

    if (doc.y + rowHeight > pageBottom() - 24) {
      doc.addPage();
      printHeader();
    }
    const y = doc.y;
    if (index % 2 === 0) {
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill("#F8FAFC");
    }
    doc.fillColor("black");

    row.forEach((v, i) => {
      doc.rect(colX[i], y, widths[i], rowHeight).stroke("#D5DDE5");
      doc.text(String(v ?? ""), colX[i] + cellPadding, y + cellPadding, {
        width: widths[i] - cellPadding * 2,
        height: rowHeight - cellPadding * 2,
      });
    });
    doc.y = y + rowHeight + 3;
  });

  const totalLineY = doc.y + 6;
  if (totalLineY + 24 > pageBottom() - 16) {
    doc.addPage();
    printHeader();
  }
  doc
    .roundedRect(tableLeft, doc.y + 6, tableWidth, 20, 6)
    .fill("#E8F5E9")
    .stroke("#9DBA9D");
  doc.fillColor("#163020").font("Helvetica-Bold").fontSize(10).text(
    `TOTAL GENERAL: ${totalUnits} bienes en ${totalAssets} registros`,
    tableLeft + 12,
    doc.y + 12,
    { width: tableWidth - 24, align: "center" }
  );
  doc.fillColor("black");
  doc.y += 32;

  const stateLines = Math.max(1, stateStats.length);
  const dependencyLines = Math.max(1, Math.min(4, dependencyStats.length));
  const typeLines = Math.max(1, Math.min(4, typeStats.length));
  const legendLines = 1;
  const brandLines = Math.max(1, Math.min(4, brandStats.length));
  const responsibleLines = Math.max(1, Math.min(4, responsibleStats.length));
  const lowerBlockLines = Math.max(typeLines, brandLines, responsibleLines);
  const summaryHeight =
    122 + Math.max(stateLines, dependencyLines) * 18 + lowerBlockLines * 18 + legendLines * 16;
  if (doc.y + summaryHeight > pageBottom() - 16) {
    doc.addPage();
    printHeader();
  }
  const summaryY = doc.y + 8;
  doc.roundedRect(tableLeft, summaryY, tableWidth, summaryHeight - 14, 6).fill("#EEF6EE").stroke("#9DBA9D");
  doc.fillColor("#163020").font("Helvetica-Bold").fontSize(10).text("RESUMEN FINAL", tableLeft + 12, summaryY + 8);
  doc.font("Helvetica").fontSize(9.5);
  doc.text(`Total de registros: ${totalAssets}`, tableLeft + 12, summaryY + 22);
  doc.text(`Cantidad total de bienes: ${totalUnits}`, tableLeft + 220, summaryY + 22);
  const chartLeft = tableLeft + 12;
  const chartTop = summaryY + 42;
  const chartLabelWidth = 110;
  const chartBarWidth = 150;
  const chartValueX = chartLeft + chartLabelWidth + chartBarWidth + 12;
  const chartPctX = chartValueX + 42;
  const maxStateValue = Math.max(...stateStats.map(([, count]) => count), 1);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#163020").text("Por estado", chartLeft, chartTop - 14);
  stateStats.forEach(([stateName, count], idx) => {
    const y = chartTop + idx * 18;
    const barWidth = Math.max(10, Math.round((count / maxStateValue) * chartBarWidth));
    const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 1000) / 10 : 0;
    const colors = getStateColor(stateName);
    doc.fillColor("#334155").fontSize(8.5).text(stateName, chartLeft, y, {
      width: chartLabelWidth - 8,
    });
    doc.rect(chartLeft + chartLabelWidth, y + 2, chartBarWidth, 9).stroke("#B8C4D0");
    doc.rect(chartLeft + chartLabelWidth, y + 2, barWidth, 9).fill(colors.fill);
    doc.fillColor(colors.text).text(String(count), chartValueX, y, { width: 36, align: "right" });
    doc.text(`${pct}%`, chartPctX, y, { width: 40, align: "right" });
  });
  const depLeft = tableLeft + tableWidth / 2 + 26;
  const depTop = chartTop;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#163020").text("Por dependencia", depLeft, depTop - 14);
  dependencyStats.slice(0, 4).forEach(([dependencyName, count], idx) => {
    const y = depTop + idx * 18;
    const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 1000) / 10 : 0;
    doc.font("Helvetica").fillColor("#334155").text(dependencyName, depLeft, y, {
      width: 150,
      ellipsis: true,
    });
    doc.fillColor("#163020").text(String(count), depLeft + 188, y, {
      width: 34,
      align: "right",
    });
    doc.text(`${pct}%`, depLeft + 228, y, {
      width: 40,
      align: "right",
    });
  });
  if (dependencyStats.length > 4) {
    doc.fillColor("#64748B").text(`+${dependencyStats.length - 4} dependencias más`, depLeft, depTop + 4 * 18, {
      width: 220,
    });
  }
  const secondRowTop = chartTop + Math.max(stateLines, dependencyLines) * 18 + 22;
  const typeLeft = chartLeft;
  const typeTop = secondRowTop;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#163020").text("Por tipo de activo", typeLeft, typeTop - 14);
  typeStats.slice(0, 4).forEach(([typeName, count], idx) => {
    const y = typeTop + idx * 18;
    const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 1000) / 10 : 0;
    doc.font("Helvetica").fillColor("#334155").text(typeName, typeLeft, y, {
      width: 160,
      ellipsis: true,
    });
    doc.fillColor("#163020").text(String(count), typeLeft + 168, y, {
      width: 34,
      align: "right",
    });
    doc.text(`${pct}%`, typeLeft + 210, y, {
      width: 40,
      align: "right",
    });
  });
  if (typeStats.length > 4) {
    doc.fillColor("#64748B").text(`+${typeStats.length - 4} tipos más`, typeLeft, typeTop + 4 * 18, {
      width: 220,
    });
  }
  const brandLeft = tableLeft + tableWidth / 3 + 18;
  const brandTop = secondRowTop;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#163020").text("Por marca", brandLeft, brandTop - 14);
  brandStats.slice(0, 4).forEach(([brandName, count], idx) => {
    const y = brandTop + idx * 18;
    const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 1000) / 10 : 0;
    doc.font("Helvetica").fillColor("#334155").text(brandName, brandLeft, y, {
      width: 150,
      ellipsis: true,
    });
    doc.fillColor("#163020").text(String(count), brandLeft + 158, y, {
      width: 30,
      align: "right",
    });
    doc.text(`${pct}%`, brandLeft + 196, y, {
      width: 38,
      align: "right",
    });
  });
  if (brandStats.length > 4) {
    doc.fillColor("#64748B").text(`+${brandStats.length - 4} marcas más`, brandLeft, brandTop + 4 * 18, {
      width: 220,
    });
  }
  const respLeft = tableLeft + (tableWidth * 2) / 3 + 24;
  const respTop = secondRowTop;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#163020")
    .text("Por responsable", respLeft, respTop - 14);
  responsibleStats.slice(0, 4).forEach(([responsibleName, count], idx) => {
    const y = respTop + idx * 18;
    const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 1000) / 10 : 0;
    doc.font("Helvetica").fillColor("#334155").text(responsibleName, respLeft, y, {
      width: 140,
      ellipsis: true,
    });
    doc.fillColor("#163020").text(String(count), respLeft + 148, y, {
      width: 28,
      align: "right",
    });
    doc.text(`${pct}%`, respLeft + 184, y, {
      width: 38,
      align: "right",
    });
  });
  if (responsibleStats.length > 4) {
    doc.fillColor("#64748B").text(
      `+${responsibleStats.length - 4} responsables más`,
      respLeft,
      respTop + 4 * 18,
      { width: 220 }
    );
  }
  const legendTop = summaryY + summaryHeight - 34;
  const legendItems = [
    { label: "Bueno", color: getStateColor("BUENO").fill },
    { label: "Baja", color: getStateColor("BAJA").fill },
    { label: "Malo/Critico", color: getStateColor("MALO").fill },
    { label: "Otros", color: getStateColor("OTRO").fill },
  ];
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#163020").text("Leyenda:", tableLeft + 12, legendTop);
  legendItems.forEach((item, idx) => {
    const x = tableLeft + 70 + idx * 120;
    doc.rect(x, legendTop + 1, 12, 8).fill(item.color).stroke("#94A3B8");
    doc.fillColor("#334155").font("Helvetica").text(item.label, x + 18, legendTop - 1, { width: 90 });
  });
  doc.fillColor("black");

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(13).text("FIRMAS Y SELLO", { align: "center" });
  doc.moveDown(1.8);
  doc.font("Helvetica").fontSize(10);

  const blockTop = doc.y + 30;
  const signatureWidth = 250;
  const signatureGap = 36;
  const leftSignatureX = tableLeft + 60;
  const rightSignatureX = leftSignatureX + signatureWidth + signatureGap;
  const signatureLineY = blockTop + 42;

  doc.fontSize(9).fillColor("#475569");
  doc.text("Firma responsable", leftSignatureX, blockTop, {
    width: signatureWidth,
    align: "center",
  });
  doc.text("Firma jefatura", rightSignatureX, blockTop, {
    width: signatureWidth,
    align: "center",
  });

  doc.moveTo(leftSignatureX, signatureLineY).lineTo(leftSignatureX + signatureWidth, signatureLineY).stroke();
  doc.moveTo(rightSignatureX, signatureLineY).lineTo(rightSignatureX + signatureWidth, signatureLineY).stroke();

  doc.fillColor("black").fontSize(10);
  doc.text(meta.responsibleName || "Encargado de Dependencia", leftSignatureX, signatureLineY + 8, {
    width: signatureWidth,
    align: "center",
  });
  doc.text(meta.chiefName || "Jefe de Dependencia", rightSignatureX, signatureLineY + 8, {
    width: signatureWidth,
    align: "center",
  });

  const sealWidth = 230;
  const sealHeight = 120;
  const sealX = tableLeft + (tableWidth - sealWidth) / 2;
  const sealY = signatureLineY + 78;
  doc.roundedRect(sealX, sealY, sealWidth, sealHeight, 8).stroke("#94A3B8");
  doc.font("Helvetica-Bold").fontSize(11).text("SELLO ESTABLECIMIENTO", sealX, sealY + 12, {
    width: sealWidth,
    align: "center",
  });
  doc.font("Helvetica").fontSize(9).fillColor("#64748B").text(
    "Espacio reservado para timbre y validacion institucional",
    sealX + 20,
    sealY + 40,
    { width: sealWidth - 40, align: "center" }
  );
  doc.fillColor("black");
  doc.fontSize(10);

  return doc;
}

module.exports = { buildPlanchetaPdf };
