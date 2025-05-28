const jwt = require('jsonwebtoken');

const privilegedOnly = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const allowedUserCodes = ['0', '21', '22'];
    if (!allowedUserCodes.includes(decoded.userCode)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = privilegedOnly;
