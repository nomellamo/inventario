// src/utils/parsePlanchetaFilters.js
function toInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parsePlanchetaFilters(query) {
  const includeHistoryRaw = String(query.includeHistory ?? "true").toLowerCase();
  return {
    dependencyId: toInt(query.dependencyId),
    establishmentId: toInt(query.establishmentId),
    fromDate: String(query.fromDate || "").trim(),
    toDate: String(query.toDate || "").trim(),
    includeHistory: includeHistoryRaw === "true" || includeHistoryRaw === "1",
    responsibleName: String(query.responsibleName || "").trim(),
    chiefName: String(query.chiefName || "").trim(),
    ministryText: String(query.ministryText || "").trim(),
  };
}

module.exports = { parsePlanchetaFilters };
