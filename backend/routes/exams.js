const express = require('express');
const router = express.Router();
const excelService = require('../services/excelService');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Get exams
// Admins see all; Students see only Published exams (with attempt status)
router.get('/', verifyToken, (req, res) => {
  try {
    const allExams = excelService.getExams();
    const isAdmin = req.user && req.user.role === 'admin';

    if (isAdmin) {
      return res.json({ success: true, exams: allExams });
    }

    // Student view
    const studentId = req.user.id;
    const studentResults = excelService.findResultsByStudentId(studentId);
    const attemptedExamIds = new Set(studentResults.map((r) => r.examId));

    const publishedExams = allExams
      .filter((e) => e.status === 'Published')
      .map((e) => {
        const attempted = attemptedExamIds.has(e.examId);
        const result = attempted ? studentResults.find((r) => r.examId === e.examId) : null;
        return {
          ...e,
          isAttempted: attempted,
          attemptResult: result
            ? {
                marks: result.marks,
                percentage: result.percentage,
                result: result.result,
                submittedAt: result.submittedAt
              }
            : null
        };
      });

    res.json({ success: true, exams: publishedExams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single exam details
router.get('/:id', verifyToken, (req, res) => {
  try {
    const exam = excelService.findExamById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }
    res.json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create exam (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { examName, description, duration, passMarks, startDate, endDate, status } = req.body;

    if (!examName || !duration || passMarks === undefined) {
      return res.status(400).json({ success: false, message: 'Exam Name, Duration, and Pass Marks are required.' });
    }

    const examId = excelService.generateExamId();

    const newExam = {
      examId,
      examName: examName.trim(),
      description: description ? description.trim() : '',
      duration: Number(duration) || 30,
      totalQuestions: 0,
      totalMarks: 0,
      passMarks: Number(passMarks) || 0,
      status: status || 'Published',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || ''
    };

    await excelService.addExam(newExam);
    res.status(201).json({ success: true, message: 'Exam created successfully.', exam: newExam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update exam (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = excelService.findExamById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    if (updates.duration) updates.duration = Number(updates.duration);
    if (updates.passMarks !== undefined) updates.passMarks = Number(updates.passMarks);

    const updated = await excelService.updateExam(id, updates);
    res.json({ success: true, message: 'Exam updated successfully.', exam: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle publish status (Admin only)
router.patch('/:id/publish', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const exam = excelService.findExamById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const newStatus = exam.status === 'Published' ? 'Draft' : 'Published';
    const updated = await excelService.updateExam(id, { status: newStatus });
    res.json({
      success: true,
      message: `Exam marked as ${newStatus}.`,
      status: newStatus,
      exam: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete all exams (Admin only)
router.delete('/bulk/all', requireAdmin, async (req, res) => {
  try {
    await excelService.clearAllExams();
    res.json({ success: true, message: 'All exams and their associated questions have been deleted from Excel.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete exam (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await excelService.deleteExam(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }
    res.json({ success: true, message: 'Exam and its questions deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
