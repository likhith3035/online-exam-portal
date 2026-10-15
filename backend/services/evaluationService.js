const excelService = require('./excelService');

/**
 * Evaluates student responses against server-stored questions.
 * Never relies on client-provided correctness.
 */
function evaluateExam({ examId, studentId, answers = {}, startTime, endTime }) {
  const exam = excelService.findExamById(examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  const questions = excelService.getQuestions(examId);
  if (!questions || questions.length === 0) {
    throw new Error('No questions found for this exam');
  }

  const resultId = `RES_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let obtainedMarks = 0;
  let totalMarks = 0;

  const responsesList = [];

  questions.forEach((q) => {
    const qMarks = Number(q.marks) || 1;
    totalMarks += qMarks;

    const selected = (answers[q.qNo] || '').trim().toUpperCase();
    const correct = (q.correctAnswer || '').trim().toUpperCase();

    let status = 'Unanswered';
    if (!selected) {
      unansweredCount++;
      status = 'Unanswered';
    } else if (selected === correct) {
      correctCount++;
      obtainedMarks += qMarks;
      status = 'Correct';
    } else {
      wrongCount++;
      status = 'Wrong';
    }

    responsesList.push({
      resultId,
      studentId,
      examId,
      qNo: q.qNo,
      selected: selected || 'None',
      correct,
      status
    });
  });

  // Calculate elapsed time
  let timeTakenStr = '0m 0s';
  if (startTime && endTime) {
    const elapsedSeconds = Math.max(0, Math.floor((new Date(endTime) - new Date(startTime)) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    timeTakenStr = `${mins}m ${secs}s`;
  }

  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const isPass = obtainedMarks >= (Number(exam.passMarks) || 0);
  const resultStatus = isPass ? 'PASS' : 'FAIL';

  const formatClock = (date) => {
    if (!date) return new Date().toTimeString().split(' ')[0];
    const d = new Date(date);
    return d.toTimeString().split(' ')[0];
  };

  const resultRecord = {
    resultId,
    studentId,
    examId,
    start: formatClock(startTime),
    end: formatClock(endTime),
    time: timeTakenStr,
    marks: obtainedMarks,
    percentage: `${percentage}%`,
    result: resultStatus,
    submittedAt: new Date().toISOString()
  };

  return {
    resultRecord,
    responsesList,
    summary: {
      resultId,
      examId,
      examName: exam.examName,
      studentId,
      totalQuestions: questions.length,
      correctCount,
      wrongCount,
      unansweredCount,
      totalMarks,
      obtainedMarks,
      percentage,
      passMarks: exam.passMarks,
      result: resultStatus,
      timeTaken: timeTakenStr,
      isPass
    }
  };
}

module.exports = {
  evaluateExam
};
