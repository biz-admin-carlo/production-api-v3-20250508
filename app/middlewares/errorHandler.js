module.exports = (err, req, res, next) => {
  console.error('❌ Error Handler:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message,
  });
};
