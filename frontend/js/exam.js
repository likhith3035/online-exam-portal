// NBKRIST Examination Portal - Exam Hall Engine

let currentExam = null;
let questions = [];
let currentIndex = 0; // 0-based
let userAnswers = {}; // { 1: 'B', 2: 'A' }
let reviewFlags = {}; // { 1: true }
let remainingSeconds = 0;
let timerInterval = null;
let isSubmitting = false;

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

window.addEventListener('DOMContentLoaded', async () => {
  const user = API.checkAuth('student');
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');

  if (!examId) {
    API.showToast('No exam specified.', 'error');
    window.location.href = 'student.html';
    return;
  }

  document.getElementById('navStudentRoll').textContent = `Candidate: ${user.name} (${user.id})`;

  // Restore stored answers from session if student reloaded
  const savedAnswers = localStorage.getItem(`nbkrist_answers_${examId}`);
  if (savedAnswers) {
    try { userAnswers = JSON.parse(savedAnswers); } catch {}
  }
  const savedReviews = localStorage.getItem(`nbkrist_reviews_${examId}`);
  if (savedReviews) {
    try { reviewFlags = JSON.parse(savedReviews); } catch {}
  }

  await loadExamAndQuestions(examId);
  setupProctoring();
});

// Anti-Cheat Proctoring Safeguards
function setupProctoring() {
  let warningCount = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      warningCount++;
      const alertBox = document.getElementById('proctorAlert');
      alertBox.textContent = `⚠ Proctor Warning #${warningCount}: Navigating away from the exam tab is prohibited! Action registered.`;
      alertBox.style.display = 'block';

      setTimeout(() => {
        alertBox.style.display = 'none';
      }, 5000);
    }
  });

  // Block Ctrl+C, Ctrl+U, Ctrl+S, F12
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && ['c', 'u', 's', 'p'].includes(e.key.toLowerCase())) || e.key === 'F12') {
      e.preventDefault();
      API.showToast('Shortcut disabled during examination.', 'error');
    }
  });
}

async function loadExamAndQuestions(examId) {
  try {
    const res = await API.request(`/api/questions/exam/${examId}`);
    currentExam = res.exam;
    questions = res.questions || [];

    if (!questions.length) {
      alert('This exam currently has no questions configured. Returning to portal.');
      window.location.href = 'student.html';
      return;
    }

    document.getElementById('navExamTitle').textContent = currentExam.examName;

    // Check timer status from backend
    await initTimer(examId);

    // Render palette and first question
    renderPalette();
    renderQuestion(0);
  } catch (err) {
    API.showToast(err.message, 'error');
    setTimeout(() => { window.location.href = 'student.html'; }, 1500);
  }
}

async function initTimer(examId) {
  try {
    const timerRes = await API.request(`/api/exam-session/${examId}/time-left`);
    remainingSeconds = Math.max(0, timerRes.remainingSeconds);

    if (timerRes.isExpired || remainingSeconds <= 0) {
      alert('The time allocated for this examination has expired. Auto-submitting...');
      submitExamFinal(true);
      return;
    }

    updateTimerDisplay();
    startCountdown();

    // Re-sync with backend clock every 45 seconds to prevent drift
    setInterval(async () => {
      try {
        const syncRes = await API.request(`/api/exam-session/${examId}/time-left`);
        if (syncRes.success) {
          remainingSeconds = syncRes.remainingSeconds;
          if (remainingSeconds <= 0) {
            submitExamFinal(true);
          }
        }
      } catch {}
    }, 45000);

  } catch (err) {
    console.error('Timer init error:', err);
    // Fallback to exam duration
    remainingSeconds = (Number(currentExam.duration) || 30) * 60;
    startCountdown();
  }
}

function startCountdown() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      alert('⏱ Time is UP! Your examination is being submitted automatically.');
      submitExamFinal(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const countdownElem = document.getElementById('timerCountdown');
  const timerBadge = document.getElementById('timerBadge');

  if (countdownElem) countdownElem.textContent = timeStr;

  if (remainingSeconds <= 300) { // Under 5 minutes
    timerBadge.classList.add('urgent');
  } else {
    timerBadge.classList.remove('urgent');
  }
}

function renderQuestion(index) {
  currentIndex = index;
  const q = questions[index];
  if (!q) return;

  document.getElementById('qCurrentPill').textContent = `Question ${index + 1} of ${questions.length}`;
  document.getElementById('qMarksPill').textContent = `+${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}`;
  document.getElementById('qTitleText').textContent = q.question;

  document.getElementById('reviewCheckbox').checked = !!reviewFlags[q.qNo];

  // Options
  const currentSelection = userAnswers[q.qNo] || null;
  const options = [
    { key: 'A', text: q.optionA },
    { key: 'B', text: q.optionB },
    { key: 'C', text: q.optionC },
    { key: 'D', text: q.optionD }
  ];

  const listContainer = document.getElementById('optionsListContainer');
  listContainer.innerHTML = options.map((opt) => {
    const isSelected = currentSelection === opt.key;
    return `
      <div class="option-card ${isSelected ? 'selected' : ''}" onclick="selectOption('${opt.key}')">
        <div class="radio-circle">${opt.key}</div>
        <div class="option-text">${opt.text}</div>
      </div>
    `;
  }).join('');

  // Update button labels
  document.getElementById('btnPrev').disabled = index === 0;
  document.getElementById('btnNext').textContent = index === questions.length - 1 ? 'Save & Review 🏁' : 'Save & Next →';

  updatePaletteHighlights();
}

function selectOption(key) {
  const q = questions[currentIndex];
  userAnswers[q.qNo] = key;
  localStorage.setItem(`nbkrist_answers_${currentExam.examId}`, JSON.stringify(userAnswers));

  // Re-render question options and update palette
  renderQuestion(currentIndex);
  renderPalette();
}

function clearCurrentSelection() {
  const q = questions[currentIndex];
  delete userAnswers[q.qNo];
  localStorage.setItem(`nbkrist_answers_${currentExam.examId}`, JSON.stringify(userAnswers));
  renderQuestion(currentIndex);
  renderPalette();
}

function toggleMarkForReview() {
  const q = questions[currentIndex];
  const isChecked = document.getElementById('reviewCheckbox').checked;
  if (isChecked) {
    reviewFlags[q.qNo] = true;
  } else {
    delete reviewFlags[q.qNo];
  }
  localStorage.setItem(`nbkrist_reviews_${currentExam.examId}`, JSON.stringify(reviewFlags));
  renderPalette();
}

function navigateQuestion(direction) {
  const targetIndex = currentIndex + direction;
  if (targetIndex >= 0 && targetIndex < questions.length) {
    renderQuestion(targetIndex);
  } else if (targetIndex >= questions.length) {
    promptFinishExam();
  }
}

function jumpToQuestion(index) {
  renderQuestion(index);
}

function renderPalette() {
  const container = document.getElementById('paletteGridContainer');
  let answeredCount = 0;

  container.innerHTML = questions.map((q, idx) => {
    const isAnswered = !!userAnswers[q.qNo];
    const isReview = !!reviewFlags[q.qNo];
    const isCurrent = idx === currentIndex;

    if (isAnswered) answeredCount++;

    let statusClass = '';
    if (isReview) {
      statusClass = 'review';
    } else if (isAnswered) {
      statusClass = 'answered';
    }

    if (isCurrent) statusClass += ' active';

    return `
      <button type="button" class="palette-btn ${statusClass}" onclick="jumpToQuestion(${idx})">
        ${idx + 1}
      </button>
    `;
  }).join('');

  document.getElementById('progressText').textContent = `${answeredCount} / ${questions.length} Answered`;
}

function updatePaletteHighlights() {
  const buttons = document.querySelectorAll('.palette-btn');
  buttons.forEach((btn, idx) => {
    if (idx === currentIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function promptFinishExam() {
  const total = questions.length;
  let answered = 0;
  let inReview = 0;

  questions.forEach((q) => {
    if (userAnswers[q.qNo]) answered++;
    if (reviewFlags[q.qNo]) inReview++;
  });

  const unanswered = total - answered;

  document.getElementById('submitSummarySpecs').innerHTML = `
    <div class="spec-item">
      <span>Total Questions</span>
      <span>${total}</span>
    </div>
    <div class="spec-item">
      <span>Answered</span>
      <span style="color: var(--success-600);">${answered}</span>
    </div>
    <div class="spec-item">
      <span>Unanswered</span>
      <span style="color: var(--danger-600);">${unanswered}</span>
    </div>
    <div class="spec-item">
      <span>In Review</span>
      <span style="color: var(--purple-600);">${inReview}</span>
    </div>
  `;

  openModal('finishModal');
}

async function submitExamFinal(isAuto = false) {
  if (isSubmitting) return;
  isSubmitting = true;

  if (timerInterval) clearInterval(timerInterval);

  const btn = document.getElementById('confirmSubmitBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting & Evaluating...';
  }

  try {
    const res = await API.request(`/api/exam-session/${currentExam.examId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        answers: userAnswers
      })
    });

    // Clear local exam state
    localStorage.removeItem(`nbkrist_answers_${currentExam.examId}`);
    localStorage.removeItem(`nbkrist_reviews_${currentExam.examId}`);

    // Store summary for instant result display
    sessionStorage.setItem('nbkrist_latest_result', JSON.stringify(res.summary));

    API.showToast('Exam submitted successfully!', 'success');
    window.location.href = `result.html?examId=${currentExam.examId}`;

  } catch (err) {
    API.showToast('Submission error: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm & Submit →';
    }
    isSubmitting = false;
  }
}
