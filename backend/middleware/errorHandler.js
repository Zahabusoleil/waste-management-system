module.exports = (err, req, res, next) => {
  console.error(err);

  const statusCode =
    err.statusCode ||
    (err.name === "ValidationError" ? 400 : err.code === 11000 ? 409 : err.name === "CastError" ? 400 : 500);
  const message =
    statusCode < 500
      ? err.message || "Request could not be processed."
      : "Something went wrong.";

  res.status(statusCode).json({
    message,
  });
};
