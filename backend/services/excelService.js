const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const FILE_PATH = path.join(DATA_DIR, 'exam_data.xlsx');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache to guarantee high-performance, atomic operations and Windows file-lock tolerance
let database = {
  admins: [],
  students: [],
  exams: [],
  questions: [],
  results: [],
  responses: [],
  reviews: []
};

let isWriting = false;
let pendingWrite = false;

// Helpers
function formatDate(date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(date = new Date()) {
  const d = new Date(date);
  return d.toTimeString().split(' ')[0]; // HH:MM:SS
}

// Initialize seed data if file is new
async function seedDefaultData() {
  const salt = await bcrypt.genSalt(10);
  const defaultStudentHash = await bcrypt.hash('student123', salt);
  const defaultAdminHash = await bcrypt.hash('admin123', salt);

  database.admins = [
    {
      adminId: 'ADM001',
      name: 'NBKRIST Chief Exam Controller',
      username: 'admin',
      email: 'examcell@nbkrist.ac.in',
      passwordHash: defaultAdminHash,
      createdAt: formatDate()
    }
  ];

  database.students = [
    {
      studentId: 'ST001',
      name: 'Rahul Kumar',
      username: 'rahul01',
      email: 'rahul@gmail.com',
      passwordHash: defaultStudentHash,
      status: 'Active',
      createdAt: formatDate()
    },
    {
      studentId: 'ST002',
      name: 'Priya Sharma',
      username: 'priya02',
      email: 'priya@gmail.com',
      passwordHash: defaultStudentHash,
      status: 'Active',
      createdAt: formatDate()
    },
    {
      studentId: 'ST003',
      name: 'Arjun Reddy',
      username: 'arjun03',
      email: 'arjun@gmail.com',
      passwordHash: defaultStudentHash,
      status: 'Active',
      createdAt: formatDate()
    }
  ];

  database.exams = [
    {
      examId: 'EX001',
      examName: 'Data Structures - Unit 1',
      description: 'Covers fundamentals of Stacks, Queues, Trees, and Complexity Analysis',
      duration: 30, // in minutes
      totalQuestions: 5,
      totalMarks: 5,
      passMarks: 3,
      status: 'Published',
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    },
    {
      examId: 'EX002',
      examName: 'Database Management Systems',
      description: 'Covers Relational Algebra, SQL queries, Normalization (1NF to BCNF) and ACID properties',
      duration: 20,
      totalQuestions: 5,
      totalMarks: 5,
      passMarks: 3,
      status: 'Published',
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    }
  ];

  database.questions = [
    // EX001
    {
      examId: 'EX001',
      qNo: 1,
      question: 'Which data structure follows the FIFO (First In First Out) principle?',
      optionA: 'Stack',
      optionB: 'Queue',
      optionC: 'Tree',
      optionD: 'Graph',
      correctAnswer: 'B',
      marks: 1
    },
    {
      examId: 'EX001',
      qNo: 2,
      question: 'Which data structure is inherently utilized by compilers to execute recursive function calls?',
      optionA: 'Stack',
      optionB: 'Queue',
      optionC: 'Binary Tree',
      optionD: 'Linked List',
      correctAnswer: 'A',
      marks: 1
    },
    {
      examId: 'EX001',
      qNo: 3,
      question: 'What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?',
      optionA: 'O(1)',
      optionB: 'O(log n)',
      optionC: 'O(n)',
      optionD: 'O(n log n)',
      correctAnswer: 'C',
      marks: 1
    },
    {
      examId: 'EX001',
      qNo: 4,
      question: 'Which tree traversal algorithm produces the keys of a Binary Search Tree in strictly ascending sorted order?',
      optionA: 'Preorder Traversal',
      optionB: 'Inorder Traversal',
      optionC: 'Postorder Traversal',
      optionD: 'Level Order Traversal',
      correctAnswer: 'B',
      marks: 1
    },
    {
      examId: 'EX001',
      qNo: 5,
      question: 'In a circular queue implemented using an array of size N, which condition confirms that the queue is full?',
      optionA: 'front == rear',
      optionB: '(rear + 1) % N == front',
      optionC: 'rear == N - 1',
      optionD: 'front == (rear + 1)',
      correctAnswer: 'B',
      marks: 1
    },
    // EX002
    {
      examId: 'EX002',
      qNo: 1,
      question: 'What does SQL stand for?',
      optionA: 'Structured Question Language',
      optionB: 'Structured Query Language',
      optionC: 'Simple Query Language',
      optionD: 'Standard Query Logic',
      correctAnswer: 'B',
      marks: 1
    },
    {
      examId: 'EX002',
      qNo: 2,
      question: 'Which Normal Form specifically eliminates partial functional dependencies on candidate keys?',
      optionA: 'First Normal Form (1NF)',
      optionB: 'Second Normal Form (2NF)',
      optionC: 'Third Normal Form (3NF)',
      optionD: 'Boyce-Codd Normal Form (BCNF)',
      correctAnswer: 'B',
      marks: 1
    },
    {
      examId: 'EX002',
      qNo: 3,
      question: 'Which ACID property guarantees that all operations within a database transaction complete successfully or none take effect?',
      optionA: 'Atomicity',
      optionB: 'Consistency',
      optionC: 'Isolation',
      optionD: 'Durability',
      correctAnswer: 'A',
      marks: 1
    },
    {
      examId: 'EX002',
      qNo: 4,
      question: 'Which SQL clause is used to filter aggregated group records produced by a GROUP BY statement?',
      optionA: 'WHERE',
      optionB: 'HAVING',
      optionC: 'FILTER',
      optionD: 'ORDER BY',
      correctAnswer: 'B',
      marks: 1
    },
    {
      examId: 'EX002',
      qNo: 5,
      question: 'Which attribute or set of attributes uniquely identifies every distinct row within a relational database table?',
      optionA: 'Foreign Key',
      optionB: 'Alternate Key',
      optionC: 'Primary Key',
      optionD: 'Surrogate Index',
      correctAnswer: 'C',
      marks: 1
    }
  ];

  database.results = [];
  database.responses = [];
  database.reviews = [];
}

// Save in-memory database to Excel workbook
async function saveToExcel() {
  if (isWriting) {
    pendingWrite = true;
    return;
  }

  isWriting = true;
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NBKRIST Examination System';
    workbook.created = new Date();

    // Style helper
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }, // NBKRIST Navy Blue
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    function applyHeaderStyles(sheet) {
      sheet.getRow(1).height = 24;
      sheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });
    }

    // 1. Admins Sheet
    const adminsSheet = workbook.addWorksheet('Admins');
    adminsSheet.columns = [
      { header: 'Admin ID', key: 'adminId', width: 14 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Password Hash', key: 'passwordHash', width: 62 },
      { header: 'Created At', key: 'createdAt', width: 16 }
    ];
    database.admins.forEach((item) => adminsSheet.addRow(item));
    applyHeaderStyles(adminsSheet);

    // 2. Students Sheet
    const studentsSheet = workbook.addWorksheet('Students');
    studentsSheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 14 },
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Password Hash', key: 'passwordHash', width: 62 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Created At', key: 'createdAt', width: 16 }
    ];
    database.students.forEach((item) => studentsSheet.addRow(item));
    applyHeaderStyles(studentsSheet);

    // 3. Exams Sheet
    const examsSheet = workbook.addWorksheet('Exams');
    examsSheet.columns = [
      { header: 'Exam ID', key: 'examId', width: 14 },
      { header: 'Exam Name', key: 'examName', width: 32 },
      { header: 'Description', key: 'description', width: 44 },
      { header: 'Duration', key: 'duration', width: 12 },
      { header: 'Questions', key: 'totalQuestions', width: 14 },
      { header: 'Total Marks', key: 'totalMarks', width: 14 },
      { header: 'Pass Marks', key: 'passMarks', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Start Date', key: 'startDate', width: 16 },
      { header: 'End Date', key: 'endDate', width: 16 }
    ];
    database.exams.forEach((item) => examsSheet.addRow(item));
    applyHeaderStyles(examsSheet);

    // 4. Questions Sheet
    const questionsSheet = workbook.addWorksheet('Questions');
    questionsSheet.columns = [
      { header: 'Exam ID', key: 'examId', width: 14 },
      { header: 'Q.No', key: 'qNo', width: 10 },
      { header: 'Question', key: 'question', width: 50 },
      { header: 'A', key: 'optionA', width: 24 },
      { header: 'B', key: 'optionB', width: 24 },
      { header: 'C', key: 'optionC', width: 24 },
      { header: 'D', key: 'optionD', width: 24 },
      { header: 'Answer', key: 'correctAnswer', width: 12 },
      { header: 'Marks', key: 'marks', width: 10 }
    ];
    database.questions.forEach((item) => questionsSheet.addRow(item));
    applyHeaderStyles(questionsSheet);

    // 5. Results Sheet
    const resultsSheet = workbook.addWorksheet('Results');
    resultsSheet.columns = [
      { header: 'Result ID', key: 'resultId', width: 16 },
      { header: 'Student ID', key: 'studentId', width: 14 },
      { header: 'Exam ID', key: 'examId', width: 14 },
      { header: 'Start', key: 'start', width: 16 },
      { header: 'End', key: 'end', width: 16 },
      { header: 'Time', key: 'time', width: 14 },
      { header: 'Marks', key: 'marks', width: 12 },
      { header: '%', key: 'percentage', width: 12 },
      { header: 'Result', key: 'result', width: 14 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 }
    ];
    database.results.forEach((item) => resultsSheet.addRow(item));
    applyHeaderStyles(resultsSheet);

    // 6. Responses Sheet
    const responsesSheet = workbook.addWorksheet('Responses');
    responsesSheet.columns = [
      { header: 'Result ID', key: 'resultId', width: 16 },
      { header: 'Student ID', key: 'studentId', width: 14 },
      { header: 'Exam ID', key: 'examId', width: 14 },
      { header: 'Q.No', key: 'qNo', width: 10 },
      { header: 'Selected', key: 'selected', width: 12 },
      { header: 'Correct', key: 'correct', width: 12 },
      { header: 'Status', key: 'status', width: 14 }
    ];
    database.responses.forEach((item) => responsesSheet.addRow(item));
    applyHeaderStyles(responsesSheet);

    // 7. Reviews Sheet
    const reviewsSheet = workbook.addWorksheet('Reviews');
    reviewsSheet.columns = [
      { header: 'Review ID', key: 'reviewId', width: 16 },
      { header: 'Student ID', key: 'studentId', width: 14 },
      { header: 'Exam ID', key: 'examId', width: 14 },
      { header: 'Rating', key: 'rating', width: 12 },
      { header: 'Review', key: 'review', width: 44 },
      { header: 'Date', key: 'date', width: 16 }
    ];
    database.reviews.forEach((item) => reviewsSheet.addRow(item));
    applyHeaderStyles(reviewsSheet);

    // Write file atomically via temp file with fallback to direct write on Windows
    const tempFilePath = `${FILE_PATH}.${Date.now()}.tmp`;
    try {
      await workbook.xlsx.writeFile(tempFilePath);
      if (fs.existsSync(FILE_PATH)) {
        try {
          fs.unlinkSync(FILE_PATH);
        } catch (err) {
          // File may be locked by another process
        }
      }
      fs.renameSync(tempFilePath, FILE_PATH);
    } catch (writeErr) {
      // Fallback: direct write to FILE_PATH
      try {
        await workbook.xlsx.writeFile(FILE_PATH);
      } catch (directErr) {
        console.error('Warning: Excel sync warning (data remains safely in memory):', directErr.message);
      }
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
      }
    }
  } catch (error) {
    console.error('Warning: Excel sync warning (data remains safely in memory):', error.message);
  } finally {
    isWriting = false;
    if (pendingWrite) {
      pendingWrite = false;
      saveToExcel();
    }
  }
}

// Load data from existing Excel file if available, or initialize
async function initDatabase() {
  if (!fs.existsSync(FILE_PATH)) {
    console.log('No existing Excel database found. Initializing exam_data.xlsx with default seed data...');
    await seedDefaultData();
    await saveToExcel();
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(FILE_PATH);

    // Helper to read rows
    function readSheet(sheetName, mapper) {
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet) return [];
      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          rows.push(mapper(row.values));
        }
      });
      return rows;
    }

    // Load Admins
    const admins = readSheet('Admins', (v) => ({
      adminId: String(v[1] || ''),
      name: String(v[2] || ''),
      username: String(v[3] || ''),
      email: String(v[4] || ''),
      passwordHash: String(v[5] || ''),
      createdAt: String(v[6] || '')
    }));

    // Load Students
    const students = readSheet('Students', (v) => ({
      studentId: String(v[1] || ''),
      name: String(v[2] || ''),
      username: String(v[3] || ''),
      email: String(v[4] || ''),
      passwordHash: String(v[5] || ''),
      status: String(v[6] || 'Active'),
      createdAt: String(v[7] || '')
    }));

    // Load Exams
    const exams = readSheet('Exams', (v) => ({
      examId: String(v[1] || ''),
      examName: String(v[2] || ''),
      description: String(v[3] || ''),
      duration: Number(v[4] || 30),
      totalQuestions: Number(v[5] || 0),
      totalMarks: Number(v[6] || 0),
      passMarks: Number(v[7] || 0),
      status: String(v[8] || 'Draft'),
      startDate: String(v[9] || ''),
      endDate: String(v[10] || '')
    }));

    // Load Questions
    const questions = readSheet('Questions', (v) => ({
      examId: String(v[1] || ''),
      qNo: Number(v[2] || 1),
      question: String(v[3] || ''),
      optionA: String(v[4] || ''),
      optionB: String(v[5] || ''),
      optionC: String(v[6] || ''),
      optionD: String(v[7] || ''),
      correctAnswer: String(v[8] || ''),
      marks: Number(v[9] || 1)
    }));

    // Load Results
    const results = readSheet('Results', (v) => ({
      resultId: String(v[1] || ''),
      studentId: String(v[2] || ''),
      examId: String(v[3] || ''),
      start: String(v[4] || ''),
      end: String(v[5] || ''),
      time: String(v[6] || ''),
      marks: Number(v[7] || 0),
      percentage: Number(String(v[8] || '0').replace('%', '')),
      result: String(v[9] || 'FAIL'),
      submittedAt: String(v[10] || '')
    }));

    // Load Responses
    const responses = readSheet('Responses', (v) => ({
      resultId: String(v[1] || ''),
      studentId: String(v[2] || ''),
      examId: String(v[3] || ''),
      qNo: Number(v[4] || 1),
      selected: String(v[5] || ''),
      correct: String(v[6] || ''),
      status: String(v[7] || '')
    }));

    // Load Reviews
    const reviews = readSheet('Reviews', (v) => ({
      reviewId: String(v[1] || ''),
      studentId: String(v[2] || ''),
      examId: String(v[3] || ''),
      rating: Number(v[4] || 5),
      review: String(v[5] || ''),
      date: String(v[6] || '')
    }));

    database = {
      admins: admins.length ? admins : [],
      students,
      exams,
      questions,
      results,
      responses,
      reviews
    };

    // If admins or seed was missing, ensure admin exists
    if (!database.admins.length) {
      await seedDefaultData();
      await saveToExcel();
    }

    // Sanitize any orphaned results, responses, or reviews whose exams no longer exist in database.exams
    const validExamIds = new Set(database.exams.map((e) => e.examId));
    const initialResCount = database.results.length;
    database.results = database.results.filter((r) => validExamIds.has(r.examId));
    database.responses = database.responses.filter((rp) => validExamIds.has(rp.examId));
    database.reviews = database.reviews.filter((rv) => validExamIds.has(rv.examId));
    database.questions = database.questions.filter((q) => validExamIds.has(q.examId));
    if (database.results.length !== initialResCount) {
      console.log(`Cleaned up ${initialResCount - database.results.length} orphaned results from deleted exams.`);
      await saveToExcel();
    }

    console.log(`Excel database loaded successfully: ${database.students.length} students, ${database.exams.length} exams, ${database.questions.length} questions, ${database.results.length} results.`);
  } catch (error) {
    console.error('Error reading Excel database, falling back to seed data:', error.message);
    await seedDefaultData();
    await saveToExcel();
  }
}

// ---------------- EXPORTED DATABASE METHODS ---------------- //

module.exports = {
  FILE_PATH,
  initDatabase,
  saveToExcel,

  // Admins
  getAdmins: () => database.admins,
  findAdminByUsername: (username) => database.admins.find((a) => a.username.toLowerCase() === username.toLowerCase()),

  // Students
  getStudents: () => database.students,
  findStudentById: (id) => database.students.find((s) => s.studentId === id),
  findStudentByUsername: (u) => database.students.find((s) => s.username.toLowerCase() === u.toLowerCase()),
  findStudentByEmail: (e) => database.students.find((s) => s.email.toLowerCase() === e.toLowerCase()),
  addStudent: async (student) => {
    database.students.push(student);
    await saveToExcel();
    return student;
  },
  updateStudent: async (id, updates) => {
    const idx = database.students.findIndex((s) => s.studentId === id);
    if (idx !== -1) {
      database.students[idx] = { ...database.students[idx], ...updates };
      await saveToExcel();
      return database.students[idx];
    }
    return null;
  },
  deleteStudent: async (id) => {
    const idx = database.students.findIndex((s) => s.studentId === id);
    if (idx !== -1) {
      database.students.splice(idx, 1);
      // Cascade delete student results, responses, and reviews
      const resIds = new Set(database.results.filter((r) => r.studentId === id).map((r) => r.resultId));
      database.results = database.results.filter((r) => r.studentId !== id);
      database.responses = database.responses.filter((rp) => rp.studentId !== id && !resIds.has(rp.resultId));
      database.reviews = database.reviews.filter((rv) => rv.studentId !== id);
      await saveToExcel();
      return true;
    }
    return false;
  },

  // Unique Monotonic Exam ID Generator (never collides with past records)
  generateExamId: () => {
    const allIds = new Set();
    database.exams.forEach((e) => allIds.add(e.examId));
    database.results.forEach((r) => allIds.add(r.examId));
    database.questions.forEach((q) => allIds.add(q.examId));
    database.responses.forEach((rp) => allIds.add(rp.examId));
    database.reviews.forEach((rv) => allIds.add(rv.examId));

    let maxNum = 0;
    for (const id of allIds) {
      const match = String(id).match(/^EX(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `EX${String(maxNum + 1).padStart(3, '0')}`;
  },

  // Exams with dynamic question/mark recalculation
  getExams: () => {
    return database.exams.map((exam) => {
      const examQuestions = database.questions.filter((q) => q.examId === exam.examId);
      const qCount = examQuestions.length;
      const qMarks = examQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      return {
        ...exam,
        totalQuestions: qCount,
        totalMarks: qMarks > 0 ? qMarks : Number(exam.totalMarks) || 0
      };
    });
  },
  findExamById: (id) => database.exams.find((e) => e.examId === id),
  addExam: async (exam) => {
    database.exams.push(exam);
    await saveToExcel();
    return exam;
  },
  updateExam: async (id, updates) => {
    const idx = database.exams.findIndex((e) => e.examId === id);
    if (idx !== -1) {
      database.exams[idx] = { ...database.exams[idx], ...updates };
      await saveToExcel();
      return database.exams[idx];
    }
    return null;
  },
  deleteExam: async (id) => {
    const idx = database.exams.findIndex((e) => e.examId === id);
    if (idx !== -1) {
      database.exams.splice(idx, 1);
      // Cascade delete questions
      database.questions = database.questions.filter((q) => q.examId !== id);
      // Cascade delete results & responses
      const resIds = new Set(database.results.filter((r) => r.examId === id).map((r) => r.resultId));
      database.results = database.results.filter((r) => r.examId !== id);
      database.responses = database.responses.filter((rp) => rp.examId !== id && !resIds.has(rp.resultId));
      // Cascade delete reviews
      database.reviews = database.reviews.filter((rv) => rv.examId !== id);
      await saveToExcel();
      return true;
    }
    return false;
  },

  // Questions
  getQuestions: (examId) => examId ? database.questions.filter((q) => q.examId === examId) : database.questions,
  addQuestion: async (question) => {
    database.questions.push(question);
    // Recalculate exam total questions & marks
    const examQuestions = database.questions.filter((q) => q.examId === question.examId);
    const exam = database.exams.find((e) => e.examId === question.examId);
    if (exam) {
      exam.totalQuestions = examQuestions.length;
      exam.totalMarks = examQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    }
    await saveToExcel();
    return question;
  },
  addQuestionsBulk: async (examId, newQuestionsList) => {
    const exam = database.exams.find((e) => e.examId === examId);
    if (!exam) return 0;

    let currentQNo = database.questions.filter((q) => q.examId === examId).length;

    for (const q of newQuestionsList) {
      currentQNo++;
      database.questions.push({
        examId,
        qNo: currentQNo,
        question: String(q.question).trim(),
        optionA: String(q.optionA).trim(),
        optionB: String(q.optionB).trim(),
        optionC: String(q.optionC).trim(),
        optionD: String(q.optionD).trim(),
        correctAnswer: String(q.correctAnswer).trim().toUpperCase(),
        marks: Number(q.marks) || 1
      });
    }

    const allQ = database.questions.filter((q) => q.examId === examId);
    exam.totalQuestions = allQ.length;
    exam.totalMarks = allQ.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    await saveToExcel();
    return allQ.length;
  },
  updateQuestion: async (examId, qNo, updates) => {
    const idx = database.questions.findIndex((q) => q.examId === examId && q.qNo === Number(qNo));
    if (idx !== -1) {
      database.questions[idx] = { ...database.questions[idx], ...updates };
      const examQuestions = database.questions.filter((q) => q.examId === examId);
      const exam = database.exams.find((e) => e.examId === examId);
      if (exam) {
        exam.totalMarks = examQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      }
      await saveToExcel();
      return database.questions[idx];
    }
    return null;
  },
  deleteQuestion: async (examId, qNo) => {
    const idx = database.questions.findIndex((q) => q.examId === examId && q.qNo === Number(qNo));
    if (idx !== -1) {
      database.questions.splice(idx, 1);
      // Re-number remaining questions for this exam
      const remaining = database.questions.filter((q) => q.examId === examId);
      remaining.forEach((q, index) => {
        q.qNo = index + 1;
      });
      const exam = database.exams.find((e) => e.examId === examId);
      if (exam) {
        exam.totalQuestions = remaining.length;
        exam.totalMarks = remaining.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      }
      await saveToExcel();
      return true;
    }
    return false;
  },

  // Results
  getResults: () => database.results,
  findResultsByStudentId: (studentId) => database.results.filter((r) => r.studentId === studentId),
  findResultByStudentAndExam: (studentId, examId) => database.results.find((r) => r.studentId === studentId && r.examId === examId),
  addResult: async (resultRecord, responsesList = []) => {
    database.results.push(resultRecord);
    if (responsesList && responsesList.length) {
      database.responses.push(...responsesList);
    }
    await saveToExcel();
    return resultRecord;
  },

  // Responses
  getResponses: (resultId) => resultId ? database.responses.filter((r) => r.resultId === resultId) : database.responses,

  // Reviews
  getReviews: (examId) => examId ? database.reviews.filter((r) => r.examId === examId) : database.reviews,
  addReview: async (reviewRecord) => {
    database.reviews.push(reviewRecord);
    await saveToExcel();
    return reviewRecord;
  },

  // BULK & INDIVIDUAL DELETE EXTENSIONS
  clearAllStudents: async () => {
    database.students = [];
    database.results = [];
    database.responses = [];
    database.reviews = [];
    await saveToExcel();
    return true;
  },

  clearAllExams: async () => {
    database.exams = [];
    database.questions = [];
    database.results = [];
    database.responses = [];
    database.reviews = [];
    await saveToExcel();
    return true;
  },

  clearQuestionsForExam: async (examId) => {
    database.questions = database.questions.filter((q) => q.examId !== examId);
    const exam = database.exams.find((e) => e.examId === examId);
    if (exam) {
      exam.totalQuestions = 0;
      exam.totalMarks = 0;
    }
    await saveToExcel();
    return true;
  },

  clearAllQuestions: async () => {
    database.questions = [];
    database.exams.forEach((e) => {
      e.totalQuestions = 0;
      e.totalMarks = 0;
    });
    await saveToExcel();
    return true;
  },

  deleteResult: async (resultId) => {
    database.results = database.results.filter((r) => r.resultId !== resultId);
    database.responses = database.responses.filter((r) => r.resultId !== resultId);
    await saveToExcel();
    return true;
  },

  deleteResultByStudentAndExam: async (studentId, examId) => {
    const toDelete = database.results.filter((r) => r.studentId === studentId && r.examId === examId);
    const resIds = new Set(toDelete.map((r) => r.resultId));
    database.results = database.results.filter((r) => !resIds.has(r.resultId));
    database.responses = database.responses.filter((r) => !resIds.has(r.resultId));
    await saveToExcel();
    return true;
  },

  clearAllResults: async () => {
    database.results = [];
    database.responses = [];
    await saveToExcel();
    return true;
  },

  deleteReview: async (reviewId) => {
    database.reviews = database.reviews.filter((r) => r.reviewId !== reviewId);
    await saveToExcel();
    return true;
  },

  clearAllReviews: async () => {
    database.reviews = [];
    await saveToExcel();
    return true;
  }
};
