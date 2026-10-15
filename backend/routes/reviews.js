const express = require('express');
const router = express.Router();
const excelService = require('../services/excelService');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/authMiddleware');

// Submit student review
router.post('/', requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { examId, rating, review } = req.body;

    if (!examId || !rating) {
      return res.status(400).json({ success: false, message: 'Exam ID and Rating (1-5) are required.' });
    }

    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const reviewId = `REV_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const reviewRecord = {
      reviewId,
      studentId,
      examId,
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      review: review ? review.trim() : 'No comments provided',
      date: new Date().toISOString().split('T')[0]
    };

    await excelService.addReview(reviewRecord);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      review: reviewRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all reviews with student and exam details (Admin only)
router.get('/', requireAdmin, (req, res) => {
  try {
    const rawReviews = excelService.getReviews();
    const students = excelService.getStudents();
    const exams = excelService.getExams();

    const studentMap = new Map(students.map((s) => [s.studentId, s]));
    const examMap = new Map(exams.map((e) => [e.examId, e]));

    let totalRating = 0;
    const enriched = rawReviews.map((r) => {
      const student = studentMap.get(r.studentId) || { name: 'Student' };
      const exam = examMap.get(r.examId) || { examName: 'Exam' };
      totalRating += Number(r.rating) || 0;
      return {
        ...r,
        studentName: student.name,
        examName: exam.examName
      };
    });

    const averageRating = rawReviews.length > 0 ? (totalRating / rawReviews.length).toFixed(1) : 0;

    res.json({
      success: true,
      totalReviews: rawReviews.length,
      averageRating: Number(averageRating),
      reviews: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete all reviews (Admin only)
router.delete('/bulk/all', requireAdmin, async (req, res) => {
  try {
    await excelService.clearAllReviews();
    res.json({ success: true, message: 'All student reviews have been cleared from Excel.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete individual review (Admin only)
router.delete('/:reviewId', requireAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params;
    await excelService.deleteReview(reviewId);
    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
