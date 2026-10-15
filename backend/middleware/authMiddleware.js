const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nbkrist_super_secret_exam_portal_key_2026';

function verifyToken(req, res, next) {
  let token = null;

  // Check header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
    }
  });
}

function requireStudent(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'student') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Forbidden. Student account required.' });
    }
  });
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  requireAdmin,
  requireStudent
};
