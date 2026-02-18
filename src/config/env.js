require("dotenv").config();

function requireEnv(name, opts = {}) {
  const val = process.env[name];
  if (!val) {
    if (opts.optional) return undefined;
    throw new Error(`Falta ${name} en .env`);
  }
  return val;
}

const NODE_ENV = process.env.NODE_ENV || "development";

const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET:
    NODE_ENV === "production"
      ? requireEnv("JWT_SECRET")
      : requireEnv("JWT_SECRET", { optional: true }) || "dev_secret",
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  UTM_VALUE_CLP: Number(process.env.UTM_VALUE_CLP || 0),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
};

if (!env.DIRECT_DATABASE_URL && !env.DATABASE_URL) {
  throw new Error("Falta DIRECT_DATABASE_URL o DATABASE_URL en .env");
}

module.exports = { env };
