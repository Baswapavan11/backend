// src/middleware/error.middleware.js

// Express error-handling middleware (4 params: err, req, res, next)
function errorMiddleware(err, req, res, next) {
  console.error("Error middleware:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong";
  const code = err.code || "INTERNAL_ERROR";

  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}

module.exports = errorMiddleware;
