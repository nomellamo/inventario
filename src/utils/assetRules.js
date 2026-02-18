const MAX_ACQUISITION_VALUE = 1_000_000_000; // CLP 1B default ceiling
const MAX_NAME_LENGTH = 200;
const MAX_SHORT_TEXT = 100;

function isFutureDate(d) {
  return d instanceof Date && d.getTime() > Date.now();
}

function validateAcquisitionDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return "acquisitionDate invalida";
  }
  if (isFutureDate(d)) {
    return "acquisitionDate no puede ser futura";
  }
  return null;
}

function validateAcquisitionValue(v) {
  if (!(Number.isFinite(v) && v > 0)) {
    return "acquisitionValue invalido";
  }
  if (v > MAX_ACQUISITION_VALUE) {
    return "acquisitionValue excede el maximo permitido";
  }
  return null;
}

function validateStringMax(name, value, max) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  if (s.length > max) {
    return `${name} excede el maximo de ${max}`;
  }
  return null;
}

function normalizeCostCenter(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.toUpperCase();
}

function normalizeRut(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  const compact = raw.replace(/\./g, "").replace(/\s+/g, "");
  const match = compact.match(/^(\d{7,8})-?([\dK])$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

function validateRutFormat(name, value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  if (!normalizeRut(value)) {
    return `${name} invalido. Usa formato 12345678-9`;
  }
  return null;
}

module.exports = {
  MAX_ACQUISITION_VALUE,
  MAX_NAME_LENGTH,
  MAX_SHORT_TEXT,
  validateAcquisitionDate,
  validateAcquisitionValue,
  validateStringMax,
  normalizeCostCenter,
  normalizeRut,
  validateRutFormat,
};
