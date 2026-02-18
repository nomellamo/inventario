const { sendError } = require("../utils/errorResponse");

function notFound(req, res, next) {
  sendError(res, {
    status: 404,
    error: "Ruta no encontrada",
    code: "ROUTE_NOT_FOUND",
    requestId: req.id,
  });
}

module.exports = { notFound };
