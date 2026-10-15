// NBKRIST Examination Portal - Admin Dashboard Controller

let cachedStudents = [];
let cachedExams = [];
let currentSelectedExamId = null;

// Modal helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Tab navigation
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));

  event.currentTarget.classList.add('active');
  const target = document.getElementById(`tab-${tabName}`);
  if (target) {
    target.classList.add('active');
  }

  // Lazy tab reload
  if (tabName === 'students') loadStudents();
  if (tabName === 'exams') loadExams();
  if (tabName === 'questions') populateExamDropdowns();
  if (tabName === 'attendance') populateExamDropdowns();
  if (tabName === 'reviews') loadReviews();
  if (tabName === 'dashboard') loadDashboardData();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  const user = API.checkAuth('admin');
  if (!user) return;

  document.getElementById('adminName').textContent = user.name || 'Admin Controller';
  
  // Configure Excel download button to work on both Express (:3000) and Live Server (:5500)
  const excelDlBtn = document.getElementById('btnDownloadExcel');
  if (excelDlBtn) {
    excelDlBtn.href = API.getUrl('/api/results/download/excel');
  }

  await loadDashboardData();
});

// Load Overall Dashboard Metrics & Recent Results
async function loadDashboardData() {
  try {
    const [studentsRes, examsRes, resultsRes] = await Promise.all([
      API.request('/api/students'),
      API.request('/api/exams'),
      API.request('/api/results')
    ]);

    cachedStudents = studentsRes.students || [];
    cachedExams = examsRes.exams || [];
    const results = resultsRes.results || [];

    // Metrics calculation
    document.getElementById('metricStudents').textContent = cachedStudents.length;
    document.getElementById('metricExams').textContent = cachedExams.length;
    document.getElementById('metricAttempts').textContent = results.length;

    if (results.length > 0) {
      const passCount = results.filter((r) => r.result === 'PASS').length;
      const passRate = Math.round((passCount / results.length) * 100);
      document.getElementById('metricPassRate').textContent = `${passRate}%`;
    } else {
      document.getElementById('metricPassRate').textContent = 'N/A';
    }

    // Render Recent Results Table
    const tbody = document.getElementById('recentResultsTableBody');
    if (!results.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 24px;">No exam submissions recorded yet.</td></tr>`;
      return;
    }

    const recent = [...results].reverse().slice(0, 10);
    tbody.innerHTML = recent.map((r) => {
      const badgeClass = r.result === 'PASS' ? 'badge-pass' : 'badge-fail';
      return `
        <tr>
          <td>
            <strong>${r.studentName}</strong><br>
            <span style="font-size: 11px; color: var(--slate-400);">${r.studentId}</span>
          </td>
          <td>${r.examName}</td>
          <td>${r.time || '—'}</td>
          <td><strong>${r.marks}</strong> / ${r.totalMarks}</td>
          <td>${r.percentage}</td>
          <td><span class="badge ${badgeClass}">${r.result}</span></td>
          <td style="font-size: 12px; color: var(--slate-500);">${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : r.start}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteSingleResult('${r.resultId}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// ----------------- STUDENTS MANAGEMENT ----------------- //

async function loadStudents() {
  try {
    const res = await API.request('/api/students');
    cachedStudents = res.students || [];
    renderStudentsTable(cachedStudents);
  } catch (err) {
    API.showToast('Failed to load students: ' + err.message, 'error');
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTableBody');
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 24px;">No student records found. Click "+ Add New Student" to enroll one.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s) => {
    const statusBadge = s.status === 'Active' ? 'badge-active' : 'badge-inactive';
    return `
      <tr>
        <td><strong>${s.studentId}</strong></td>
        <td>${s.name}</td>
        <td>${s.username}</td>
        <td>${s.email}</td>
        <td><span class="badge ${statusBadge}">${s.status}</span></td>
        <td style="font-size: 12px; color: var(--slate-500);">${s.createdAt}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="openEditStudentModal('${s.studentId}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.studentId}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterStudents() {
  const query = document.getElementById('studentSearch').value.toLowerCase().trim();
  if (!query) {
    renderStudentsTable(cachedStudents);
    return;
  }
  const filtered = cachedStudents.filter((s) =>
    s.name.toLowerCase().includes(query) ||
    s.studentId.toLowerCase().includes(query) ||
    s.email.toLowerCase().includes(query) ||
    s.username.toLowerCase().includes(query)
  );
  renderStudentsTable(filtered);
}

function openAddStudentModal() {
  document.getElementById('studentModalTitle').textContent = 'Add New Student';
  document.getElementById('studentFormMode').value = 'create';
  document.getElementById('stdName').value = '';
  document.getElementById('stdId').value = '';
  document.getElementById('stdId').disabled = false;
  document.getElementById('stdUsername').value = '';
  document.getElementById('stdUsername').disabled = false;
  document.getElementById('stdEmail').value = '';
  document.getElementById('stdPassword').value = 'student123';
  document.getElementById('stdPassword').required = true;
  document.getElementById('stdStatus').value = 'Active';
  openModal('studentModal');
}

function openEditStudentModal(id) {
  const s = cachedStudents.find((item) => item.studentId === id);
  if (!s) return;

  document.getElementById('studentModalTitle').textContent = `Edit Student: ${s.name}`;
  document.getElementById('studentFormMode').value = 'edit';
  document.getElementById('stdName').value = s.name;
  document.getElementById('stdId').value = s.studentId;
  document.getElementById('stdId').disabled = true;
  document.getElementById('stdUsername').value = s.username;
  document.getElementById('stdUsername').disabled = true;
  document.getElementById('stdEmail').value = s.email;
  document.getElementById('stdPassword').value = '';
  document.getElementById('stdPassword').required = false;
  document.getElementById('stdPasswordLabel').textContent = 'New Password (leave blank to keep current)';
  document.getElementById('stdStatus').value = s.status;
  openModal('studentModal');
}

async function handleSaveStudent(e) {
  e.preventDefault();
  const mode = document.getElementById('studentFormMode').value;
  const studentId = document.getElementById('stdId').value.trim();

  const payload = {
    name: document.getElementById('stdName').value.trim(),
    studentId,
    username: document.getElementById('stdUsername').value.trim(),
    email: document.getElementById('stdEmail').value.trim(),
    status: document.getElementById('stdStatus').value
  };

  const password = document.getElementById('stdPassword').value;
  if (password) payload.password = password;

  try {
    if (mode === 'create') {
      await API.request('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      API.showToast('Student enrolled and written to Excel successfully!', 'success');
    } else {
      await API.request(`/api/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      API.showToast('Student updated successfully!', 'success');
    }

    closeModal('studentModal');
    loadStudents();
    loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm(`Are you sure you want to delete student (${id})? This will remove them from the Excel records.`)) return;
  try {
    await API.request(`/api/students/${id}`, { method: 'DELETE' });
    API.showToast('Student deleted.', 'success');
    loadStudents();
    loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// ----------------- EXAMS MANAGEMENT ----------------- //

async function loadExams() {
  try {
    const res = await API.request('/api/exams');
    cachedExams = res.exams || [];
    renderExamsTable(cachedExams);
  } catch (err) {
    API.showToast('Failed to load exams: ' + err.message, 'error');
  }
}

function renderExamsTable(exams) {
  const tbody = document.getElementById('examsTableBody');
  if (!exams.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--slate-400); padding: 24px;">No exams found. Click "+ Create New Exam" to set up a test.</td></tr>`;
    return;
  }

  tbody.innerHTML = exams.map((e) => {
    const isPublished = e.status === 'Published';
    const statusBadge = isPublished ? 'badge-published' : 'badge-draft';
    const publishBtnText = isPublished ? 'Unpublish' : 'Publish';

    return `
      <tr>
        <td><strong>${e.examId}</strong></td>
        <td>
          <strong>${e.examName}</strong>
          ${e.description ? `<br><small style="color: var(--slate-400);">${e.description}</small>` : ''}
        </td>
        <td>${e.duration} mins</td>
        <td><strong>${e.totalQuestions}</strong></td>
        <td>${e.totalMarks}</td>
        <td>${e.passMarks}</td>
        <td><span class="badge ${statusBadge}">${e.status}</span></td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="togglePublish('${e.examId}')">${publishBtnText}</button>
            <button class="btn btn-secondary btn-sm" onclick="jumpToQuestions('${e.examId}')">MCQs (${e.totalQuestions})</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditExamModal('${e.examId}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteExam('${e.examId}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateExamModal() {
  document.getElementById('examModalTitle').textContent = 'Create New Exam';
  document.getElementById('examFormMode').value = 'create';
  document.getElementById('examName').value = '';
  document.getElementById('examDescription').value = '';
  document.getElementById('examDuration').value = 30;
  document.getElementById('examPassMarks').value = 15;
  document.getElementById('examStartDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('examEndDate').value = '';
  document.getElementById('examStatus').value = 'Published';
  openModal('examModal');
}

function openEditExamModal(id) {
  const exam = cachedExams.find((e) => e.examId === id);
  if (!exam) return;

  document.getElementById('examModalTitle').textContent = `Edit Exam: ${exam.examName}`;
  document.getElementById('examFormMode').value = 'edit';
  document.getElementById('examFormId').value = exam.examId;
  document.getElementById('examName').value = exam.examName;
  document.getElementById('examDescription').value = exam.description;
  document.getElementById('examDuration').value = exam.duration;
  document.getElementById('examPassMarks').value = exam.passMarks;
  document.getElementById('examStartDate').value = exam.startDate;
  document.getElementById('examEndDate').value = exam.endDate;
  document.getElementById('examStatus').value = exam.status;
  openModal('examModal');
}

async function handleSaveExam(e) {
  e.preventDefault();
  const mode = document.getElementById('examFormMode').value;
  const examId = document.getElementById('examFormId').value;

  const payload = {
    examName: document.getElementById('examName').value.trim(),
    description: document.getElementById('examDescription').value.trim(),
    duration: Number(document.getElementById('examDuration').value),
    passMarks: Number(document.getElementById('examPassMarks').value),
    startDate: document.getElementById('examStartDate').value,
    endDate: document.getElementById('examEndDate').value,
    status: document.getElementById('examStatus').value
  };

  try {
    if (mode === 'create') {
      await API.request('/api/exams', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      API.showToast('Exam created successfully!', 'success');
    } else {
      await API.request(`/api/exams/${examId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      API.showToast('Exam updated.', 'success');
    }

    closeModal('examModal');
    await loadExams();
    await populateExamDropdowns();
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function togglePublish(id) {
  try {
    const res = await API.request(`/api/exams/${id}/publish`, { method: 'PATCH' });
    API.showToast(res.message, 'success');
    await loadExams();
    await populateExamDropdowns();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function deleteExam(id) {
  if (!confirm(`Are you sure you want to delete exam (${id}) and all of its associated questions?`)) return;
  try {
    await API.request(`/api/exams/${id}`, { method: 'DELETE' });
    API.showToast('Exam deleted.', 'success');
    await loadExams();
    await populateExamDropdowns();
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

function jumpToQuestions(examId) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs[3].click(); // Switch to Question Bank tab
  setTimeout(() => {
    document.getElementById('questionsExamSelect').value = examId;
    loadQuestionsForSelectedExam();
  }, 100);
}

// ----------------- QUESTIONS MANAGEMENT ----------------- //

async function populateExamDropdowns() {
  const res = await API.request('/api/exams');
  cachedExams = res.exams || [];

  const qSelect = document.getElementById('questionsExamSelect');
  const aSelect = document.getElementById('attendanceExamSelect');

  const optionsHtml = cachedExams.map((e) => `<option value="${e.examId}">${e.examId}: ${e.examName} (${e.status})</option>`).join('');

  qSelect.innerHTML = `<option value="">-- Choose Exam --</option>` + optionsHtml;
  aSelect.innerHTML = `<option value="">-- Select Exam to View Attendance --</option>` + optionsHtml;

  if (currentSelectedExamId) {
    qSelect.value = currentSelectedExamId;
    loadQuestionsForSelectedExam();
  }
}

async function loadQuestionsForSelectedExam() {
  const examId = document.getElementById('questionsExamSelect').value;
  currentSelectedExamId = examId;
  const addBtn = document.getElementById('addQuestionBtn');
  const importBtn = document.getElementById('btnSmartImport');
  const deleteExamQuestionsBtn = document.getElementById('btnDeleteExamQuestions');
  const container = document.getElementById('questionsContainer');

  if (!examId) {
    if (addBtn) addBtn.disabled = true;
    if (importBtn) importBtn.disabled = true;
    if (deleteExamQuestionsBtn) deleteExamQuestionsBtn.disabled = true;
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--slate-400);">Please select an exam above to view questions.</div>`;
    return;
  }

  if (addBtn) addBtn.disabled = false;
  if (importBtn) importBtn.disabled = false;
  if (deleteExamQuestionsBtn) deleteExamQuestionsBtn.disabled = false;
  try {
    const res = await API.request(`/api/questions/exam/${examId}`);
    const questions = res.questions || [];

    if (!questions.length) {
      container.innerHTML = `
        <div class="glass-panel" style="text-align: center; padding: 40px;">
          <p style="color: var(--slate-500); margin-bottom: 14px;">No MCQ questions added for this exam yet.</p>
          <button class="btn btn-primary" onclick="openAddQuestionModal()">+ Add First Question</button>
        </div>
      `;
      return;
    }

    container.innerHTML = questions.map((q) => {
      return `
        <div class="question-card">
          <div class="question-card-header">
            <div>
              <span class="q-number">Question #${q.qNo}</span>
              <span style="font-size: 12px; color: var(--slate-500); margin-left: 10px;">${q.marks} Mark${q.marks > 1 ? 's' : ''}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.examId}', ${q.qNo})">Delete</button>
            </div>
          </div>
          <p style="font-size: 15px; font-weight: 600; color: var(--slate-900); margin-top: 6px;">${q.question}</p>
          <div class="options-grid">
            <div class="option-item ${q.correctAnswer === 'A' ? 'correct' : ''}">
              <span class="option-letter">A:</span> <span>${q.optionA}</span>
            </div>
            <div class="option-item ${q.correctAnswer === 'B' ? 'correct' : ''}">
              <span class="option-letter">B:</span> <span>${q.optionB}</span>
            </div>
            <div class="option-item ${q.correctAnswer === 'C' ? 'correct' : ''}">
              <span class="option-letter">C:</span> <span>${q.optionC}</span>
            </div>
            <div class="option-item ${q.correctAnswer === 'D' ? 'correct' : ''}">
              <span class="option-letter">D:</span> <span>${q.optionD}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

function openAddQuestionModal() {
  const examId = document.getElementById('questionsExamSelect').value;
  if (!examId) {
    API.showToast('Please select an exam first.', 'error');
    return;
  }
  document.getElementById('qQuestion').value = '';
  document.getElementById('qOptionA').value = '';
  document.getElementById('qOptionB').value = '';
  document.getElementById('qOptionC').value = '';
  document.getElementById('qOptionD').value = '';
  document.getElementById('qCorrectAnswer').value = 'A';
  document.getElementById('qMarks').value = 1;
  openModal('questionModal');
}

async function handleSaveQuestion(e) {
  e.preventDefault();
  const examId = document.getElementById('questionsExamSelect').value;

  const payload = {
    examId,
    question: document.getElementById('qQuestion').value.trim(),
    optionA: document.getElementById('qOptionA').value.trim(),
    optionB: document.getElementById('qOptionB').value.trim(),
    optionC: document.getElementById('qOptionC').value.trim(),
    optionD: document.getElementById('qOptionD').value.trim(),
    correctAnswer: document.getElementById('qCorrectAnswer').value,
    marks: Number(document.getElementById('qMarks').value) || 1
  };

  try {
    await API.request('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    API.showToast('Question saved to Excel!', 'success');
    closeModal('questionModal');
    loadQuestionsForSelectedExam();
    loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function deleteQuestion(examId, qNo) {
  if (!confirm(`Delete Question #${qNo}?`)) return;
  try {
    await API.request(`/api/questions/${examId}/${qNo}`, { method: 'DELETE' });
    API.showToast('Question deleted.', 'success');
    loadQuestionsForSelectedExam();
    loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// ----------------- ATTENDANCE & RESULTS ----------------- //

async function loadAttendanceReport() {
  const examId = document.getElementById('attendanceExamSelect').value;
  const tbody = document.getElementById('attendanceTableBody');
  const pillContainer = document.getElementById('attendanceStatsPill');

  if (!examId) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--slate-400);">Select an exam above to generate the attendance sheet.</td></tr>`;
    pillContainer.innerHTML = '';
    return;
  }

  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Calculating live attendance...</td></tr>`;

  try {
    const res = await API.request(`/api/results/attendance/${examId}`);
    const { exam, attendance } = res;

    pillContainer.innerHTML = `
      <span class="badge" style="background: var(--primary-100); color: var(--primary-700);">Enrolled: ${exam.totalEnrolled}</span>
      <span class="badge badge-attended">Attended: ${exam.attendedCount}</span>
      <span class="badge badge-not-attended">Not Attended: ${exam.notAttendedCount}</span>
    `;

    tbody.innerHTML = attendance.map((row) => {
      const isAttended = row.attendance === 'Attended';
      const attBadge = isAttended ? 'badge-attended' : 'badge-not-attended';
      const resultBadge = row.result === 'PASS' ? 'badge-pass' : row.result === 'FAIL' ? 'badge-fail' : '';

      return `
        <tr>
          <td><strong>${row.studentId}</strong></td>
          <td>${row.studentName}</td>
          <td>${row.email}</td>
          <td><span class="badge ${attBadge}">${row.attendance}</span></td>
          <td>${row.timeTaken}</td>
          <td>${row.marks}</td>
          <td>${row.percentage}</td>
          <td>${row.result !== '—' ? `<span class="badge ${resultBadge}">${row.result}</span>` : '—'}</td>
          <td>
            ${isAttended ? `
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm" onclick="inspectResponses('${row.studentId}', '${exam.examId}')">Inspect</button>
                <button class="btn btn-danger btn-sm" onclick="resetStudentAttempt('${row.studentId}', '${exam.examId}')" title="Delete this attempt and allow student to re-take">Reset Attempt</button>
              </div>
            ` : '—'}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function inspectResponses(studentId, examId) {
  try {
    const resultsRes = await API.request('/api/results');
    const result = resultsRes.results.find((r) => r.studentId === studentId && r.examId === examId);
    if (!result) {
      API.showToast('No detailed response record found.', 'error');
      return;
    }

    const res = await API.request(`/api/results/responses/${result.resultId}`);
    const responses = res.responses || [];

    const container = document.getElementById('responsesContainer');
    if (!responses.length) {
      container.innerHTML = '<p>No question breakdown found for this submission.</p>';
    } else {
      container.innerHTML = responses.map((r) => {
        const isCorrect = r.status === 'Correct';
        const isWrong = r.status === 'Wrong';
        const color = isCorrect ? 'var(--success-600)' : isWrong ? 'var(--danger-600)' : 'var(--slate-500)';

        return `
          <div style="padding: 12px; border-bottom: 1px solid var(--slate-200); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Question #${r.qNo}</strong>
              <div style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
                Selected: <strong>${r.selected}</strong> | Correct: <strong>${r.correct}</strong>
              </div>
            </div>
            <div>
              <span style="font-weight: 700; color: ${color};">${r.status}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    openModal('responsesModal');
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// ----------------- REVIEWS MANAGEMENT ----------------- //

async function loadReviews() {
  const container = document.getElementById('reviewsListContainer');
  try {
    const res = await API.request('/api/reviews');
    const reviews = res.reviews || [];

    document.getElementById('reviewOverviewText').innerHTML = `
      Overall Rating: <span style="color: var(--accent-gold); font-size: 18px;">★ ${res.averageRating}</span> / 5.0 (${res.totalReviews} Total Reviews)
    `;

    if (!reviews.length) {
      container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--slate-400);">No student feedback submitted yet.</div>`;
      return;
    }

    container.innerHTML = reviews.map((r) => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      return `
        <div class="review-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <strong>${r.studentName}</strong>
              <span style="font-size: 12px; color: var(--slate-400); margin-left: 8px;">on ${r.examName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="rating-stars">${stars}</span>
              <span style="font-size: 12px; color: var(--slate-400);">${r.date}</span>
              <button class="btn btn-danger btn-sm" onclick="deleteSingleReview('${r.reviewId}')">Delete</button>
            </div>
          </div>
          <p style="font-size: 14px; color: var(--slate-700); font-style: italic;">"${r.review}"</p>
        </div>
      `;
    }).join('');

  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// =========================================================================
// 🚀 SMART QUESTION IMPORTER & AI DETECTION CONTROLLER
// =========================================================================

let detectedQuestionsList = [];
let parseDebounceTimer = null;

function openSmartImportModal() {
  const examId = document.getElementById('questionsExamSelect').value;
  if (!examId) {
    API.showToast('Please select a target exam first.', 'error');
    return;
  }

  const exam = cachedExams.find(e => e.examId === examId);
  if (exam) {
    document.getElementById('aiTopicInput').value = exam.examName;
  }

  // If text area has text, re-parse; else prompt
  if (document.getElementById('bulkImportText').value.trim()) {
    parseCurrentTextNow();
  }

  openModal('smartImportModal');
}

function copyAIPrompt() {
  const topic = document.getElementById('aiTopicInput').value.trim() || 'Computer Science';
  const count = document.getElementById('aiCountSelect').value || 10;
  const diff = document.getElementById('aiDiffSelect').value || 'Medium';

  const prompt = SmartParser.generatePrompt(topic, count, diff);

  navigator.clipboard.writeText(prompt).then(() => {
    API.showToast('Prompt copied to clipboard! Paste it into ChatGPT or Claude.', 'success');
  }).catch(() => {
    // Fallback prompt alert
    prompt('Copy the prompt below:', prompt);
  });
}

function switchImportSource(tab) {
  document.getElementById('importPanelText').style.display = tab === 'text' ? 'block' : 'none';
  document.getElementById('importPanelImage').style.display = tab === 'image' ? 'block' : 'none';
  document.getElementById('importPanelFile').style.display = tab === 'file' ? 'block' : 'none';

  document.getElementById('importTabBtnText').classList.toggle('active', tab === 'text');
  document.getElementById('importTabBtnImage').classList.toggle('active', tab === 'image');
  document.getElementById('importTabBtnFile').classList.toggle('active', tab === 'file');
}

function loadSampleText() {
  switchImportSource('text');
  document.getElementById('bulkImportText').value = SmartParser.getSampleText();
  parseCurrentTextNow();
  API.showToast('Loaded 5 sample questions! Check preview below.', 'info');
}

function clearImportText() {
  document.getElementById('bulkImportText').value = '';
  detectedQuestionsList = [];
  renderImportPreview([]);
}

function debounceParseText() {
  if (parseDebounceTimer) clearTimeout(parseDebounceTimer);
  parseDebounceTimer = setTimeout(() => {
    const rawText = (document.getElementById('bulkImportText')?.value || '').trim();
    if (!rawText) {
      detectedQuestionsList = [];
      renderImportPreview([]);
      return;
    }
    detectedQuestionsList = SmartParser.parseText(rawText);
    renderImportPreview(detectedQuestionsList);
  }, 300);
}

function parseCurrentTextNow() {
  const rawText = (document.getElementById('bulkImportText')?.value || '').trim();
  if (!rawText) {
    detectedQuestionsList = [];
    renderImportPreview([]);
    API.showToast('Please paste questions or upload an Excel/CSV file first.', 'warning');
    return;
  }
  detectedQuestionsList = SmartParser.parseText(rawText);
  renderImportPreview(detectedQuestionsList);
  if (detectedQuestionsList.length > 0) {
    API.showToast(`✨ Detected ${detectedQuestionsList.length} questions successfully!`, 'success');
  } else {
    API.showToast('No questions could be detected. Ensure options (A, B, C, D) and answers are included.', 'warning');
  }
}

function renderImportPreview(questions) {
  const container = document.getElementById('importPreviewContainer');
  const countBadge = document.getElementById('detectedCountBadge');
  const saveBtn = document.getElementById('btnConfirmBulkSave');

  const count = questions.length;
  countBadge.textContent = `${count} Question${count === 1 ? '' : 's'} Ready`;
  saveBtn.disabled = count === 0;
  saveBtn.textContent = `Import All Detected Questions (${count}) to Exam 🚀`;

  if (count === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--slate-400); background: var(--slate-50); border-radius: var(--radius-md);">
        No valid questions detected yet. Paste text above or click "⚡ Load Sample Questions" to test!
      </div>
    `;
    return;
  }

  container.innerHTML = questions.map((q, idx) => {
    return `
      <div class="question-card" style="margin-bottom: 16px; border-left: 4px solid var(--primary-600);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <span class="q-number" style="background: var(--primary-100); color: var(--primary-700);">#${idx + 1}</span>
            <span style="font-size: 12px; color: var(--slate-500); margin-left: 8px;">Auto-Detected Question</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <label style="font-weight: 600; color: var(--slate-700);">Correct:</label>
              <select class="form-control" style="width: 80px; padding: 4px 8px; font-weight: 700; color: var(--success-600);" onchange="updateDetectedQuestion(${idx}, 'correctAnswer', this.value)">
                <option value="A" ${q.correctAnswer === 'A' ? 'selected' : ''}>A</option>
                <option value="B" ${q.correctAnswer === 'B' ? 'selected' : ''}>B</option>
                <option value="C" ${q.correctAnswer === 'C' ? 'selected' : ''}>C</option>
                <option value="D" ${q.correctAnswer === 'D' ? 'selected' : ''}>D</option>
              </select>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeDetectedQuestion(${idx})" title="Delete question">🗑</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 10px;">
          <input type="text" class="form-control" style="font-weight: 600; font-size: 14px;" value="${escapeHtml(q.question)}" oninput="updateDetectedQuestion(${idx}, 'question', this.value)">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 700; width: 22px; color: ${q.correctAnswer === 'A' ? 'var(--success-600)' : 'var(--slate-500)'};">A:</span>
            <input type="text" class="form-control" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(q.optionA)}" oninput="updateDetectedQuestion(${idx}, 'optionA', this.value)">
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 700; width: 22px; color: ${q.correctAnswer === 'B' ? 'var(--success-600)' : 'var(--slate-500)'};">B:</span>
            <input type="text" class="form-control" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(q.optionB)}" oninput="updateDetectedQuestion(${idx}, 'optionB', this.value)">
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 700; width: 22px; color: ${q.correctAnswer === 'C' ? 'var(--success-600)' : 'var(--slate-500)'};">C:</span>
            <input type="text" class="form-control" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(q.optionC)}" oninput="updateDetectedQuestion(${idx}, 'optionC', this.value)">
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 700; width: 22px; color: ${q.correctAnswer === 'D' ? 'var(--success-600)' : 'var(--slate-500)'};">D:</span>
            <input type="text" class="form-control" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(q.optionD)}" oninput="updateDetectedQuestion(${idx}, 'optionD', this.value)">
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function updateDetectedQuestion(index, field, value) {
  if (detectedQuestionsList[index]) {
    detectedQuestionsList[index][field] = value;
  }
}

function removeDetectedQuestion(index) {
  detectedQuestionsList.splice(index, 1);
  renderImportPreview(detectedQuestionsList);
}

// Image OCR Handler
async function handleImageOCR(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusMsg = document.getElementById('ocrStatusMsg');
  statusMsg.style.display = 'block';
  statusMsg.textContent = '⏳ Initializing Tesseract OCR Engine...';

  try {
    if (typeof Tesseract === 'undefined') {
      throw new Error('OCR library still loading or offline. Please paste questions text instead.');
    }

    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          statusMsg.textContent = `Scanning image: ${Math.round(m.progress * 100)}% complete...`;
        }
      }
    });

    statusMsg.textContent = '✓ Text extracted successfully! Switching to text preview...';
    document.getElementById('bulkImportText').value = text;
    switchImportSource('text');
    parseCurrentTextNow();
    API.showToast('OCR extraction complete! Auto-detected questions shown below.', 'success');

  } catch (err) {
    statusMsg.textContent = `❌ OCR Notice: ${err.message}`;
    API.showToast('OCR Error: ' + err.message, 'error');
  }
}

// Spreadsheet & Excel (.xlsx, .xls, .csv, .tsv, .txt) Upload Handler
function handleSpreadsheetUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    if (typeof XLSX === 'undefined') {
      API.showToast('SheetJS Excel library is loading. Please check internet connection or upload CSV.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        detectedQuestionsList = SmartParser.parseExcel(data);
        renderImportPreview(detectedQuestionsList);
        if (detectedQuestionsList.length > 0) {
          API.showToast(`📊 Detected ${detectedQuestionsList.length} questions from Excel file!`, 'success');
        } else {
          API.showToast('No questions detected in Excel file. Please ensure sheet has Question & Option columns.', 'warning');
        }
      } catch (err) {
        API.showToast('Failed to parse Excel file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // CSV, TSV or TXT file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        // Try spreadsheet tabular format first
        let questions = SmartParser.parseCSV(content);
        // Fallback to text parsing if CSV gave 0 questions (e.g. user uploaded a text file with formatted questions)
        if (!questions || questions.length === 0) {
          questions = SmartParser.parseText(content);
        }
        detectedQuestionsList = questions || [];
        renderImportPreview(detectedQuestionsList);
        if (detectedQuestionsList.length > 0) {
          API.showToast(`📄 Detected ${detectedQuestionsList.length} questions from file!`, 'success');
        } else {
          API.showToast('No questions detected in file. Please verify questions format.', 'warning');
        }
      } catch (err) {
        API.showToast('Failed to parse file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }
}

// Backward-compatible alias
const handleCSVUpload = handleSpreadsheetUpload;

// Download Native Excel (.xlsx) Template
function downloadSampleExcel() {
  if (typeof XLSX !== 'undefined') {
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks'],
      ['Which data structure follows First-In-First-Out (FIFO) principle?', 'Stack', 'Queue', 'Binary Tree', 'Graph', 'B', 1],
      ['What is the time complexity of searching in a balanced Binary Search Tree (AVL)?', 'O(1)', 'O(log n)', 'O(n)', 'O(n^2)', 'B', 1],
      ['Which normal form eliminates transitive dependency in DBMS?', '1NF', '2NF', '3NF', 'BCNF', 'C', 1],
      ['In Python, which keyword is used to define an anonymous lambda function?', 'def', 'func', 'lambda', 'anonymous', 'C', 1],
      ['What is the primary function of DNS in computer networks?', 'Encrypt data', 'Resolve domain names to IP addresses', 'Route packets across LAN', 'Assign dynamic IP addresses', 'B', 1]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'NBKRIST_Question_Import_Template.xlsx');
    API.showToast('📥 Downloaded NBKRIST_Question_Import_Template.xlsx!', 'success');
  } else {
    downloadSampleCSV();
  }
}

// Download Sample CSV Template
function downloadSampleCSV() {
  const csvContent = `Question,Option A,Option B,Option C,Option D,Correct Answer,Marks
Which data structure follows FIFO?,Stack,Queue,Tree,Graph,B,1
What is the time complexity of binary search?,O(1),O(log n),O(n),O(n^2),B,1
Which normal form removes partial dependencies?,1NF,2NF,3NF,BCNF,B,1
In Python, which keyword defines an anonymous function?,def,func,lambda,anonymous,C,1`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'NBKRIST_Question_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.appendChild(link);
  link.remove();
  API.showToast('📥 Downloaded NBKRIST_Question_Import_Template.csv!', 'success');
}

// Final Save to Excel & Backend
async function saveAllBulkQuestions() {
  const examId = document.getElementById('questionsExamSelect').value;
  if (!examId) {
    API.showToast('No target exam selected.', 'error');
    return;
  }

  if (!detectedQuestionsList.length) {
    API.showToast('No questions to import.', 'error');
    return;
  }

  const saveBtn = document.getElementById('btnConfirmBulkSave');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Importing into Excel Database...';

  try {
    const res = await API.request('/api/questions/bulk', {
      method: 'POST',
      body: JSON.stringify({
        examId,
        questions: detectedQuestionsList
      })
    });

    API.showToast(`🎉 ${res.message}`, 'success');
    closeModal('smartImportModal');

    // Reload exam questions in view and update dashboard
    await loadQuestionsForSelectedExam();
    await loadDashboardData();

    // Clear import state
    document.getElementById('bulkImportText').value = '';
    detectedQuestionsList = [];
    renderImportPreview([]);

  } catch (err) {
    API.showToast('Bulk import failed: ' + err.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = `Import All Detected Questions (${detectedQuestionsList.length}) to Exam 🚀`;
  }
}

// =========================================================================
// 🗑 BULK & INDIVIDUAL ROW DELETION CONTROLLERS
// =========================================================================

// 1. Delete single exam attempt / result record
async function deleteSingleResult(resultId) {
  if (!confirm(`Are you sure you want to delete this result record (${resultId})? This will also remove the student's question-by-question responses.`)) return;

  try {
    const res = await API.request(`/api/results/${resultId}`, { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 2. Clear ALL results across all exams
async function clearAllResultsPrompt() {
  if (!confirm('⚠ WARNING: Are you sure you want to delete ALL student exam attempts, scores, and responses from Excel? This will completely reset all attempts.')) return;

  try {
    const res = await API.request('/api/results/bulk/all', { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadDashboardData();
    const attExamSelect = document.getElementById('attendanceExamSelect');
    if (attExamSelect && attExamSelect.value) {
      await loadAttendanceReport();
    }
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 3. Clear ALL students
async function clearAllStudentsPrompt() {
  if (!confirm('⚠ WARNING: Are you sure you want to delete ALL students from the database and Excel?')) return;

  try {
    const res = await API.request('/api/students/bulk/all', { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadStudents();
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 4. Clear ALL exams
async function clearAllExamsPrompt() {
  if (!confirm('⚠ WARNING: Are you sure you want to delete ALL exams and all their questions from the database?')) return;

  try {
    const res = await API.request('/api/exams/bulk/all', { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadExams();
    await populateExamDropdowns();
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 5. Clear all questions for selected exam
async function clearQuestionsForExamPrompt() {
  const examId = document.getElementById('questionsExamSelect').value;
  if (!examId) {
    API.showToast('Please select an exam first.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to delete ALL MCQ questions for exam (${examId})?`)) return;

  try {
    const res = await API.request(`/api/questions/exam/${examId}/all`, { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadQuestionsForSelectedExam();
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 6. Reset single student attempt in attendance
async function resetStudentAttempt(studentId, examId) {
  if (!confirm(`Reset exam attempt for student (${studentId}) on this exam? This will allow the student to retake the exam from scratch.`)) return;

  try {
    const res = await API.request(`/api/results/student/${studentId}/exam/${examId}`, { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadAttendanceReport();
    await loadDashboardData();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 7. Delete single review
async function deleteSingleReview(reviewId) {
  if (!confirm('Are you sure you want to delete this student review?')) return;

  try {
    const res = await API.request(`/api/reviews/${reviewId}`, { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadReviews();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

// 8. Clear ALL reviews
async function clearAllReviewsPrompt() {
  if (!confirm('Are you sure you want to delete ALL student reviews from Excel?')) return;

  try {
    const res = await API.request('/api/reviews/bulk/all', { method: 'DELETE' });
    API.showToast(res.message, 'success');
    await loadReviews();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

