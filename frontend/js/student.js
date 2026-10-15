// NBKRIST Examination Portal - Student Portal Controller

let currentSelectedExam = null;

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

window.addEventListener('DOMContentLoaded', async () => {
  const user = API.checkAuth('student');
  if (!user) return;

  document.getElementById('studentNavName').textContent = user.name || user.username;
  document.getElementById('studentGreetingName').textContent = user.name || user.username;
  document.getElementById('studentRollPill').textContent = `Roll No: ${user.id} | ${user.email}`;

  await Promise.all([
    loadAvailableExams(),
    loadMyPastResults()
  ]);

  // Auto-refresh when tab regains focus or becomes visible
  window.addEventListener('focus', () => {
    loadAvailableExams(true);
    loadMyPastResults(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadAvailableExams(true);
      loadMyPastResults(true);
    }
  });
});

async function refreshStudentPortal() {
  const btn = document.getElementById('btnRefreshStudent');
  if (btn) btn.textContent = 'Refreshing... ⏳';
  await Promise.all([
    loadAvailableExams(),
    loadMyPastResults()
  ]);
  if (btn) btn.textContent = '🔄 Refresh';
  API.showToast('Examination portal refreshed with live data.', 'info');
}

async function loadAvailableExams(isSilent = false) {
  const container = document.getElementById('examsGridContainer');
  try {
    const res = await API.request('/api/exams');
    const exams = res.exams || [];

    if (!exams.length) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;" class="glass-panel">
          <p style="font-size: 16px; color: var(--slate-600);">No examinations are currently active or published.</p>
          <small style="color: var(--slate-400);">Please check back later or contact your department examination cell.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = exams.map((exam) => {
      const isAttempted = exam.isAttempted;
      const resultData = exam.attemptResult;
      const hasQuestions = Number(exam.totalQuestions) > 0;

      let actionHtml = '';
      let statusBadge = '';

      if (isAttempted) {
        const isPass = resultData && resultData.result === 'PASS';
        const badgeColor = isPass ? 'badge-pass' : 'badge-fail';
        statusBadge = `<span class="badge ${badgeColor}">${resultData ? resultData.result : 'COMPLETED'}</span>`;
        actionHtml = `
          <div style="background: var(--slate-50); padding: 12px; border-radius: var(--radius-md); margin-top: 10px; text-align: center;">
            <div style="font-size: 13px; color: var(--slate-600); margin-bottom: 8px;">
              Score: <strong>${resultData ? resultData.marks : '—'}</strong> (${resultData ? resultData.percentage : ''})
            </div>
            <a href="result.html?examId=${exam.examId}" class="btn btn-secondary btn-sm" style="width: 100%;">
              View Official Scorecard 📄
            </a>
          </div>
        `;
      } else if (!hasQuestions) {
        statusBadge = `<span class="badge badge-draft">Preparing</span>`;
        actionHtml = `
          <div style="background: var(--slate-50); border: 1px dashed var(--slate-300); padding: 12px; border-radius: var(--radius-md); margin-top: 12px; text-align: center;">
            <div style="font-size: 13px; color: var(--slate-700); font-weight: 600;">
              ⏳ Questions Being Prepared
            </div>
            <small style="color: var(--slate-500); font-size: 11px;">The examination cell is finalizing questions for this exam.</small>
          </div>
        `;
      } else {
        statusBadge = `<span class="badge badge-published">Ready</span>`;
        actionHtml = `
          <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;" onclick='promptStartExam(${JSON.stringify(exam)})'>
            Attend Exam →
          </button>
        `;
      }

      return `
        <div class="exam-card">
          <div>
            <div class="exam-card-header">
              <span style="font-size: 12px; font-weight: 700; color: var(--primary-600); text-transform: uppercase;">${exam.examId}</span>
              ${statusBadge}
            </div>
            <h3 class="exam-card-title">${exam.examName}</h3>
            <p class="exam-card-desc">${exam.description || 'Comprehensive multiple-choice assessment for registered students.'}</p>
            
            <div class="exam-specs">
              <div class="spec-item">
                <span>⏱ Duration</span>
                <span>${exam.duration} Minutes</span>
              </div>
              <div class="spec-item">
                <span>❓ Questions</span>
                <span>${exam.totalQuestions} MCQs</span>
              </div>
              <div class="spec-item">
                <span>🎯 Total Marks</span>
                <span>${exam.totalMarks}</span>
              </div>
              <div class="spec-item">
                <span>🚩 Passing Mark</span>
                <span>${exam.passMarks}</span>
              </div>
            </div>
          </div>
          <div>
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    if (!isSilent) API.showToast(err.message, 'error');
  }
}

function promptStartExam(exam) {
  currentSelectedExam = exam;
  document.getElementById('modalExamName').textContent = exam.examName;

  document.getElementById('modalExamSpecs').innerHTML = `
    <div class="spec-item">
      <span>Duration</span>
      <span>${exam.duration} Minutes</span>
    </div>
    <div class="spec-item">
      <span>Questions</span>
      <span>${exam.totalQuestions} Questions</span>
    </div>
    <div class="spec-item">
      <span>Total Marks</span>
      <span>${exam.totalMarks}</span>
    </div>
    <div class="spec-item">
      <span>Passing Marks</span>
      <span>${exam.passMarks}</span>
    </div>
  `;

  openModal('instructionsModal');
}

async function confirmStartExam() {
  if (!currentSelectedExam) return;

  const btn = document.getElementById('modalStartExamBtn');
  btn.disabled = true;
  btn.textContent = 'Initializing Session...';

  try {
    const res = await API.request(`/api/exam-session/${currentSelectedExam.examId}/start`, {
      method: 'POST'
    });

    closeModal('instructionsModal');
    API.showToast('Exam started. Good luck!', 'success');
    window.location.href = `exam.html?examId=${currentSelectedExam.examId}`;
  } catch (err) {
    API.showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'START EXAMINATION NOW →';
  }
}

async function loadMyPastResults() {
  const tbody = document.getElementById('myResultsTableBody');
  try {
    const res = await API.request('/api/results/my-results');
    const results = res.results || [];

    if (!results.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 24px;">No completed exams found yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = results.map((r) => {
      const isPass = r.result === 'PASS';
      const badge = isPass ? 'badge-pass' : 'badge-fail';

      return `
        <tr>
          <td><strong>${r.examName}</strong><br><small style="color: var(--slate-400);">${r.examId}</small></td>
          <td><strong>${r.marks}</strong> / ${r.totalMarks}</td>
          <td>${r.percentage}</td>
          <td><span class="badge ${badge}">${r.result}</span></td>
          <td>${r.time}</td>
          <td style="font-size: 13px; color: var(--slate-600);">${r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}</td>
          <td>
            <a href="result.html?examId=${r.examId}" class="btn btn-secondary btn-sm">View Card</a>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    API.showToast(err.message, 'error');
  }
}
