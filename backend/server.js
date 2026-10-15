require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const excelService = require('./services/excelService');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const examRoutes = require('./routes/exams');
const questionRoutes = require('./routes/questions');
const examSessionRoutes = require('./routes/examSession');
const resultRoutes = require('./routes/results');
const reviewRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware with comprehensive CORS for local dev servers (e.g. Live Server on :5500)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Strict Cache Prevention Middleware for API routes to avoid stale client data
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exam-session', examSessionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'NBKRIST Online Examination Portal',
    timestamp: new Date().toISOString(),
    excelPath: excelService.FILE_PATH
  });
});

// Clean client route redirects
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(frontendPath, 'student.html'));
});

app.get('/exam', (req, res) => {
  res.sendFile(path.join(frontendPath, 'exam.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(path.join(frontendPath, 'result.html'));
});

// Fallback to index.html for unmatched GET routes
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Start server
async function startServer() {
  try {
    await excelService.initDatabase();

    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🎓 NBKRIST Online Examination System is LIVE!`);
      console.log(`🌐 Server running at: http://localhost:${PORT}`);
      console.log(`📊 Excel Database:    ${excelService.FILE_PATH}`);
      console.log(`👨‍💼 Admin Login:      admin / admin123`);
      console.log(`👨‍🎓 Student Logins:   rahul01, priya02, arjun03 (pwd: student123)`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
