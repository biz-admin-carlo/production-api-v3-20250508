const loginLogger = async (req, res, next) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  const { email = null, latitude = null, longitude = null, device = null } = req.body;

  res.locals.loginMeta = {
    email,
    ipAddress,
    userAgent,
    latitude,
    longitude,
    device
  };

  next();
};

module.exports = { loginLogger };
