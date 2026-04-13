module.exports.errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    error: {
      message: err.message || "Internal Server Error",
      status: statusCode,
    },
  };

  // in dev → stack visibile
  if (!isProd) {
    response.error.stack = err.stack;
  }

  console.error("[ERROR]", err);

  res.status(statusCode).json(response);
};
