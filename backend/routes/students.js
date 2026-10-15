const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const excelService = require('../services/excelService');
const { requireAdmin } = require('../middleware/authMiddleware');

// Get all students (Admin only)
router.get('/', requireAdmin, (req, res) => {
  try {
    const students = excelService.getStudents().map((s) => ({
      studentId: s.studentId,
      name: s.name,
      username: s.username,
      email: s.email,
      status: s.status,
      createdAt: s.createdAt
    }));
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add new student (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, studentId, username, email, password, status } = req.body;

    if (!name || !studentId || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (Name, Student ID, Username, Email, Password) are required.' });
    }

    // Check unique constraints
    if (excelService.findStudentById(studentId)) {
      return res.status(400).json({ success: false, message: `Student ID "${studentId}" already exists.` });
    }
    if (excelService.findStudentByUsername(username)) {
      return res.status(400).json({ success: false, message: `Username "${username}" already exists.` });
    }
    if (excelService.findStudentByEmail(email)) {
      return res.status(400).json({ success: false, message: `Email "${email}" is already registered.` });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newStudent = {
      studentId: studentId.trim(),
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      passwordHash,
      status: status || 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    await excelService.addStudent(newStudent);

    res.status(201).json({
      success: true,
      message: 'Student account created and saved to Excel successfully.',
      student: {
        studentId: newStudent.studentId,
        name: newStudent.name,
        username: newStudent.username,
        email: newStudent.email,
        status: newStudent.status,
        createdAt: newStudent.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update student (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, password } = req.body;

    const existing = excelService.findStudentById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim();
    if (status) updates.status = status;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await excelService.updateStudent(id, updates);
    res.json({
      success: true,
      message: 'Student updated successfully.',
      student: {
        studentId: updated.studentId,
        name: updated.name,
        username: updated.username,
        email: updated.email,
        status: updated.status,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete all students (Admin only)
router.delete('/bulk/all', requireAdmin, async (req, res) => {
  try {
    await excelService.clearAllStudents();
    res.json({ success: true, message: 'All student records have been deleted from Excel.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete student (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await excelService.deleteStudent(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
