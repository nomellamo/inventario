const pinoHttp = require("pino-http");
const { env } = require("../config/env");

function requestLogger() {
  return pinoHttp({
    level: env.NODE_ENV === "production" ? "info" : "debug",
    redact: {
      paths: ["req.headers.authorization", "req.body.password"],
      remove: true,
    },
    customProps: (req) => ({
      requestId: req.id,
    }),
  });
}

module.exports = { requestLogger };
