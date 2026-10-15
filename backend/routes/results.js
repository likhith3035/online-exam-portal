const express = require('express');
const router = express.Router();
const path = require('path');
const excelService = require('../services/excelService');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const examSessionRoutes = require('./examSession');

// Get all results (Admin) with student and exam details
router.get('/', requireAdmin, (req, res) => {
  try {
    const rawResults = excelService.getResults();
    const students = excelService.getStudents();
    const exams = excelService.getExams();

    const studentMap = new Map(students.map((s) => [s.studentId, s]));
    const examMap = new Map(exams.map((e) => [e.examId, e]));

    const enriched = rawResults.map((r) => {
      const student = studentMap.get(r.studentId) || { name: 'Unknown', email: '' };
      const exam = examMap.get(r.examId) || { examName: 'Unknown', totalMarks: 0, passMarks: 0 };
      return {
        ...r,
        studentName: student.name,
        studentEmail: student.email,
        examName: exam.examName,
        totalMarks: exam.totalMarks,
        passMarks: exam.passMarks
      };
    });

    res.json({ success: true, results: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get personal results for logged-in student
router.get('/my-results', verifyToken, (req, res) => {
  try {
    const studentId = req.user.id;
    const rawResults = excelService.findResultsByStudentId(studentId);
    const exams = excelService.getExams();
    const examMap = new Map(exams.map((e) => [e.examId, e]));

    const enriched = rawResults.map((r) => {
      const exam = examMap.get(r.examId) || { examName: 'Unknown', totalMarks: 0, passMarks: 0 };
      const responses = excelService.getResponses(r.resultId) || [];
      const totalQuestions = responses.length;
      const correctCount = responses.filter((rp) => rp.status === 'Correct').length;
      const wrongCount = responses.filter((rp) => rp.status === 'Wrong').length;
      const unansweredCount = responses.filter((rp) => rp.status === 'Unanswered').length;

      return {
        ...r,
        examName: exam.examName,
        totalMarks: exam.totalMarks || r.totalMarks || 0,
        passMarks: exam.passMarks || 0,
        totalQuestions,
        correctCount,
        wrongCount,
        unansweredCount
      };
    });

    res.json({ success: true, results: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Attendance Report for a specific exam (Admin only)
router.get('/attendance/:examId', requireAdmin, (req, res) => {
  try {
    const { examId } = req.params;
    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const allStudents = excelService.getStudents();
    const examResults = excelService.getResults().filter((r) => r.examId === examId);
    const resultMap = new Map(examResults.map((r) => [r.studentId, r]));

    let attendedCount = 0;
    let notAttendedCount = 0;

    const records = allStudents.map((st) => {
      const result = resultMap.get(st.studentId);
      const attended = !!result;

      if (attended) {
        attendedCount++;
      } else {
        notAttendedCount++;
      }

      return {
        studentId: st.studentId,
        studentName: st.name,
        email: st.email,
        status: st.status,
        attendance: attended ? 'Attended' : 'Not Attended',
        timeTaken: attended ? result.time : '—',
        marks: attended ? result.marks : '—',
        percentage: attended ? result.percentage : '—',
        result: attended ? result.result : '—',
        submittedAt: attended ? result.submittedAt : '—'
      };
    });

    res.json({
      success: true,
      exam: {
        examId: exam.examId,
        examName: exam.examName,
        totalEnrolled: allStudents.length,
        attendedCount,
        notAttendedCount
      },
      attendance: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// View detailed response breakdown for a result
router.get('/responses/:resultId', verifyToken, (req, res) => {
  try {
    const { resultId } = req.params;
    const responses = excelService.getResponses(resultId);
    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Direct Excel Download (.xlsx)
router.get('/download/excel', requireAdmin, (req, res) => {
  try {
    const filePath = excelService.FILE_PATH;
    res.download(filePath, 'NBKRIST_Exam_Data.xlsx', (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not download Excel file.' });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete all results & responses (Admin only)
router.delete('/bulk/all', requireAdmin, async (req, res) => {
  try {
    await excelService.clearAllResults();
    if (examSessionRoutes.clearActiveSession) {
      examSessionRoutes.clearActiveSession();
    }
    res.json({ success: true, message: 'All exam results and responses have been cleared from Excel.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset / Delete single student attempt for an exam (Admin only)
router.delete('/student/:studentId/exam/:examId', requireAdmin, async (req, res) => {
  try {
    const { studentId, examId } = req.params;
    await excelService.deleteResultByStudentAndExam(studentId, examId);
    if (examSessionRoutes.clearActiveSession) {
      examSessionRoutes.clearActiveSession(studentId, examId);
    }
    res.json({ success: true, message: `Exam attempt for student (${studentId}) on exam (${examId}) has been reset.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete single result by ID (Admin only)
router.delete('/:resultId', requireAdmin, async (req, res) => {
  try {
    const { resultId } = req.params;
    await excelService.deleteResult(resultId);
    res.json({ success: true, message: `Result record (${resultId}) deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
