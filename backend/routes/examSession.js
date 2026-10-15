const express = require('express');
const router = express.Router();
const excelService = require('../services/excelService');
const { evaluateExam } = require('../services/evaluationService');
const { sendResultEmail } = require('../services/emailService');
const { requireStudent } = require('../middleware/authMiddleware');

// In-memory active session tracker to enforce server-side timer integrity
// Key: `${studentId}_${examId}` -> { startTime, durationMinutes, isStarted }
const activeSessions = new Map();

// 1. Start Exam Session
router.post('/:examId/start', requireStudent, (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    if (exam.status !== 'Published') {
      return res.status(403).json({ success: false, message: 'This exam is not yet published.' });
    }

    // Check if student already submitted this exam
    const existingResult = excelService.findResultByStudentAndExam(studentId, examId);
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this exam. Only one attempt is allowed.',
        alreadySubmitted: true,
        resultId: existingResult.resultId
      });
    }

    const sessionKey = `${studentId}_${examId}`;
    let session = activeSessions.get(sessionKey);

    // If session exists but is already expired (e.g. from an old interrupted run), reset it:
    if (session) {
      const allowedSecs = (Number(session.durationMinutes) || 30) * 60;
      const elapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
      if (elapsed >= allowedSecs) {
        session = null;
        activeSessions.delete(sessionKey);
      }
    }

    if (!session) {
      session = {
        studentId,
        examId,
        startTime: new Date(),
        durationMinutes: Number(exam.duration) || 30
      };
      activeSessions.set(sessionKey, session);
    }

    const totalAllowedSeconds = session.durationMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    res.json({
      success: true,
      message: 'Exam session started.',
      session: {
        examId,
        studentId,
        startTime: session.startTime,
        durationMinutes: session.durationMinutes,
        remainingSeconds
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Query Timer Status (Prevents client-clock manipulation)
router.get('/:examId/time-left', requireStudent, (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    const sessionKey = `${studentId}_${examId}`;
    const session = activeSessions.get(sessionKey);

    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found. Please start the exam.' });
    }

    const totalAllowedSeconds = session.durationMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    res.json({
      success: true,
      remainingSeconds,
      isExpired: remainingSeconds <= 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Submit Exam & Automatic Server-Side Evaluation
router.post('/:examId/submit', requireStudent, async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;
    const { answers } = req.body; // e.g. { "1": "B", "2": "A", ... }

    // Enforce 1-attempt rule
    const existingResult = excelService.findResultByStudentAndExam(studentId, examId);
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate submission rejected. You have already completed this exam.',
        resultId: existingResult.resultId
      });
    }

    const exam = excelService.findExamById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const sessionKey = `${studentId}_${examId}`;
    const session = activeSessions.get(sessionKey);
    const startTime = session ? session.startTime : new Date(Date.now() - (exam.duration * 60 * 1000));
    const endTime = new Date();

    // Secure evaluation
    const { resultRecord, responsesList, summary } = evaluateExam({
      examId,
      studentId,
      answers: answers || {},
      startTime,
      endTime
    });

    // Write to Excel (both Results and Responses sheets)
    await excelService.addResult(resultRecord, responsesList);

    // Remove active session
    activeSessions.delete(sessionKey);

    // Trigger email asynchronously (Nodemailer)
    const student = excelService.findStudentById(studentId) || {
      name: req.user.name,
      studentId,
      email: req.user.email
    };
    sendResultEmail({ student, exam, summary }).catch((err) => {
      console.error('Async email notification error:', err.message);
    });

    res.json({
      success: true,
      message: 'Exam evaluated and submitted successfully.',
      summary
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function clearActiveSession(studentId, examId) {
  if (studentId && examId) {
    activeSessions.delete(`${studentId}_${examId}`);
  } else if (examId) {
    for (const key of activeSessions.keys()) {
      if (key.endsWith(`_${examId}`)) {
        activeSessions.delete(key);
      }
    }
  } else if (studentId) {
    for (const key of activeSessions.keys()) {
      if (key.startsWith(`${studentId}_`)) {
        activeSessions.delete(key);
      }
    }
  } else {
    activeSessions.clear();
  }
}

router.clearActiveSession = clearActiveSession;
module.exports = router;
