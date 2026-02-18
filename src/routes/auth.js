const express = require("express");
const router = express.Router();
const { login, changeOwnPassword } = require("../services/authService");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateBody } = require("../middleware/validate");
const { requireJson } = require("../middleware/requireJson");
const { loginBody, changePasswordBody } = require("../validators/authSchemas");
const { rotateRefreshToken, revokeRefreshToken } = require("../services/authTokensService");
const { env } = require("../config/env");
const { sendError } = require("../utils/errorResponse");
const { authJwt } = require("../middleware/authJwt");

router.post(
  "/login",
  requireJson,
  validateBody(loginBody),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await login(email, password, req.ip);
    const cookieOptions = {
      httpOnly: true,
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    };
    res.cookie("refresh_token", result.refreshToken, cookieOptions);
    res.json({ token: result.accessToken, user: result.user });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return sendError(res, {
        status: 401,
        error: "Refresh token requerido",
        code: "REFRESH_TOKEN_REQUIRED",
        requestId: req.id,
      });
    }
    const rotated = await rotateRefreshToken(token);
    const cookieOptions = {
      httpOnly: true,
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    };
    res.cookie("refresh_token", rotated.refresh.raw, cookieOptions);
    res.json({ token: rotated.accessToken });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (token) await revokeRefreshToken(token);
    const cookieOptions = {
      httpOnly: true,
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      sameSite: "strict",
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    };
    res.clearCookie("refresh_token", cookieOptions);
    res.json({ ok: true });
  })
);

router.post(
  "/change-password",
  authJwt,
  requireJson,
  validateBody(changePasswordBody),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await changeOwnPassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  })
);

module.exports = { authRouter: router };
