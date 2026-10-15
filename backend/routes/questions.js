const express = require('express');
const router = express.Router();
const excelService = require('../services/excelService');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Get questions for an exam
// Admin gets answers; Student NEVER gets answers
router.get('/exam/:examId', verifyToken, (req, res) => {
  try {
    const { examId } = req.params;
    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const questions = excelService.getQuestions(examId);
    const isAdmin = req.user && req.user.role === 'admin';

    if (isAdmin) {
      return res.json({ success: true, exam, questions });
    }

    // Secure payload for student: mask correctAnswer
    const maskedQuestions = questions.map((q) => ({
      examId: q.examId,
      qNo: q.qNo,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      marks: q.marks
    }));

    res.json({
      success: true,
      exam: {
        examId: exam.examId,
        examName: exam.examName,
        duration: exam.duration,
        totalQuestions: exam.totalQuestions,
        totalMarks: exam.totalMarks,
        passMarks: exam.passMarks
      },
      questions: maskedQuestions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add question (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { examId, question, optionA, optionB, optionC, optionD, correctAnswer, marks } = req.body;

    if (!examId || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return res.status(400).json({ success: false, message: 'All question fields and options (A, B, C, D) are required.' });
    }

    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Target exam not found.' });
    }

    const currentQuestions = excelService.getQuestions(examId);
    const qNo = currentQuestions.length + 1;

    const newQuestion = {
      examId,
      qNo,
      question: question.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      correctAnswer: correctAnswer.trim().toUpperCase(),
      marks: Number(marks) || 1
    };

    await excelService.addQuestion(newQuestion);
    res.status(201).json({ success: true, message: 'Question added successfully.', question: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update question (Admin only)
router.put('/:examId/:qNo', requireAdmin, async (req, res) => {
  try {
    const { examId, qNo } = req.params;
    const updates = req.body;

    if (updates.correctAnswer) {
      updates.correctAnswer = updates.correctAnswer.trim().toUpperCase();
    }
    if (updates.marks !== undefined) {
      updates.marks = Number(updates.marks);
    }

    const updated = await excelService.updateQuestion(examId, Number(qNo), updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    res.json({ success: true, message: 'Question updated successfully.', question: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete all questions for a specific exam (Admin only)
router.delete('/exam/:examId/all', requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params;
    await excelService.clearQuestionsForExam(examId);
    res.json({ success: true, message: `All questions for exam (${examId}) have been cleared.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete all questions across all exams (Admin only)
router.delete('/bulk/all', requireAdmin, async (req, res) => {
  try {
    await excelService.clearAllQuestions();
    res.json({ success: true, message: 'All questions have been cleared from Excel.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete single question (Admin only)
router.delete('/:examId/:qNo', requireAdmin, async (req, res) => {
  try {
    const { examId, qNo } = req.params;
    const deleted = await excelService.deleteQuestion(examId, Number(qNo));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk import questions (Admin only)
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { examId, questions } = req.body;

    if (!examId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'examId and a non-empty array of questions are required.' });
    }

    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Target exam not found.' });
    }

    const validQuestions = questions.filter(
      (q) => q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswer
    );

    if (validQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid questions found in import payload.' });
    }

    await excelService.addQuestionsBulk(examId, validQuestions);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${validQuestions.length} questions into exam: ${exam.examName}.`,
      count: validQuestions.length
    });
  } catch (error) {
    console.error('Bulk question import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
