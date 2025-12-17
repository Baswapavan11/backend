// src/middleware/auth.middleware.js
const jwtUtil = require("../utils/jwt.util");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  // Expect "Bearer <token>"
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
      code: "UNAUTHORIZED",
    });
  }

  try {
    const payload = jwtUtil.verifyToken(token);
    // payload should have: userId, role, orgId, dbName, subOrgId (for admin)
    req.user = payload;
    next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      code: "UNAUTHORIZED",
    });
  }
}

module.exports = authMiddleware;
