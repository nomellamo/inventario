const fs = require("fs");
const path = require("path");

const BRAND_NAME = String(process.env.PUBLIC_BRAND_NAME || "Subsecretaría de la Niñez").trim();

function resolveCandidatePaths() {
  const candidates = [];
  const envPath = String(process.env.PUBLIC_BRAND_LOGO_PATH || "").trim();

  if (envPath) {
    candidates.push(path.resolve(process.cwd(), envPath));
  }

  candidates.push(
    path.resolve(process.cwd(), "frontend/src/assets/images/logodelgob.png"),
    path.resolve(__dirname, "../../frontend/src/assets/images/logodelgob.png"),
    path.resolve(process.cwd(), "frontend/src/assets/images/logo-inventacore.png"),
    path.resolve(__dirname, "../../frontend/src/assets/images/logo-inventacore.png")
  );

  return candidates;
}

let cachedLogoBuffer = null;

function getOfficialBrandLogoBuffer() {
  if (cachedLogoBuffer !== null) return cachedLogoBuffer;

  for (const filePath of resolveCandidatePaths()) {
    try {
      if (!fs.existsSync(filePath)) continue;
      cachedLogoBuffer = fs.readFileSync(filePath);
      return cachedLogoBuffer;
    } catch (_) {
      // Try next candidate.
    }
  }

  cachedLogoBuffer = null;
  return cachedLogoBuffer;
}

function getOfficialBrandLogoDataUrl() {
  const buffer = getOfficialBrandLogoBuffer();
  if (!buffer || !buffer.length) return "";
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function getOfficialBrandName() {
  return BRAND_NAME || "Subsecretaría de la Niñez";
}

module.exports = {
  getOfficialBrandLogoBuffer,
  getOfficialBrandLogoDataUrl,
  getOfficialBrandName,
};
