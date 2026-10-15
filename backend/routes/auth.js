const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const excelService = require('../services/excelService');
const { JWT_SECRET, verifyToken } = require('../middleware/authMiddleware');

// Login endpoint for both Admin and Student
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Username, password and role are required.' });
    }

    if (role === 'admin') {
      const admin = excelService.findAdminByUsername(username);

      let isValidPassword = false;
      if (admin) {
        isValidPassword = await bcrypt.compare(password, admin.passwordHash);
      } else if (username === (process.env.ADMIN_USERNAME || 'admin') && password === (process.env.ADMIN_PASSWORD || 'admin123')) {
        isValidPassword = true;
      }

      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
      }

      const adminUser = admin || {
        adminId: 'ADM001',
        name: 'NBKRIST Exam Controller',
        username: 'admin',
        email: 'examcell@nbkrist.ac.in'
      };

      const token = jwt.sign(
        {
          id: adminUser.adminId,
          name: adminUser.name,
          username: adminUser.username,
          email: adminUser.email,
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      res.cookie('token', token, { httpOnly: true, maxAge: 12 * 3600 * 1000 });
      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: adminUser.adminId,
          name: adminUser.name,
          username: adminUser.username,
          email: adminUser.email,
          role: 'admin'
        }
      });
    }

    if (role === 'student') {
      const student = excelService.findStudentByUsername(username) || excelService.findStudentByEmail(username);
      if (!student) {
        return res.status(401).json({ success: false, message: 'Student account not found.' });
      }

      if (student.status !== 'Active') {
        return res.status(403).json({ success: false, message: 'Your student account is inactive. Please contact the Exam Cell.' });
      }

      const isValidPassword = await bcrypt.compare(password, student.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid student password.' });
      }

      const token = jwt.sign(
        {
          id: student.studentId,
          name: student.name,
          username: student.username,
          email: student.email,
          role: 'student'
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.cookie('token', token, { httpOnly: true, maxAge: 8 * 3600 * 1000 });
      return res.json({
        success: true,
        message: 'Student login successful',
        token,
        user: {
          id: student.studentId,
          name: student.name,
          username: student.username,
          email: student.email,
          role: 'student'
        }
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid role specified. Must be "admin" or "student".' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Current User Profile
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
