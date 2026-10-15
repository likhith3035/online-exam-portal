// NBKRIST Examination Portal - Result Scorecard Controller

let currentExamId = '';
let selectedRating = 5;

window.addEventListener('DOMContentLoaded', async () => {
  const user = API.checkAuth();
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  currentExamId = urlParams.get('examId');

  document.getElementById('resStudentInfo').textContent = `Candidate: ${user.name} (${user.id || user.username}) • ${user.email}`;

  // 1. Try to read from sessionStorage only if matching current logged-in user and exam
  const cachedResultStr = sessionStorage.getItem('nbkrist_latest_result');
  if (cachedResultStr) {
    try {
      const summary = JSON.parse(cachedResultStr);
      const isUserMatch = !summary.studentId || summary.studentId === user.id;
      const isExamMatch = !currentExamId || summary.examId === currentExamId;
      if (isUserMatch && isExamMatch) {
        currentExamId = summary.examId;
        renderScorecard(summary);
        setupStarRating();
        return;
      }
    } catch {}
  }

  // 2. Fetch fresh verified results from backend
  await fetchResultFromBackend(currentExamId, user);
  setupStarRating();
});

async function fetchResultFromBackend(examId, user) {
  try {
    const res = await API.request('/api/results/my-results');
    const myResults = res.results || [];

    const found = examId
      ? myResults.find((r) => r.examId === examId)
      : myResults[myResults.length - 1];

    if (!found) {
      alert('No scorecard found for this examination.');
      window.location.href = 'student.html';
      return;
    }

    currentExamId = found.examId;

    // Convert to scorecard format with enriched breakdown
    const summary = {
      examName: found.examName,
      obtainedMarks: found.marks,
      totalMarks: found.totalMarks,
      percentage: Number(String(found.percentage).replace('%', '')),
      result: found.result,
      timeTaken: found.time,
      isPass: found.result === 'PASS',
      totalQuestions: found.totalQuestions !== undefined ? found.totalQuestions : '—',
      correctCount: found.correctCount !== undefined ? found.correctCount : '—',
      wrongCount: found.wrongCount !== undefined ? found.wrongCount : '—',
      unansweredCount: found.unansweredCount !== undefined ? found.unansweredCount : '—'
    };

    renderScorecard(summary);
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

function renderScorecard(summary) {
  document.getElementById('resExamName').textContent = summary.examName || 'Examination Assessment';

  const isPass = summary.result === 'PASS';
  const badge = document.getElementById('resStatusBadge');
  const scoreCircle = document.getElementById('scoreCircle');

  if (isPass) {
    badge.textContent = 'PASS ✓';
    badge.className = 'result-status-badge status-pass';
    scoreCircle.style.borderColor = 'var(--success-500)';
  } else {
    badge.textContent = 'FAIL ✗';
    badge.className = 'result-status-badge status-fail';
    scoreCircle.style.borderColor = 'var(--danger-500)';
  }

  document.getElementById('resScoreDigits').textContent = `${summary.obtainedMarks} / ${summary.totalMarks}`;
  document.getElementById('resPercentageText').textContent = `${summary.percentage}% Score`;

  document.getElementById('resTotalQ').textContent = summary.totalQuestions !== undefined ? summary.totalQuestions : '—';
  document.getElementById('resCorrect').textContent = summary.correctCount !== undefined ? summary.correctCount : '—';
  document.getElementById('resWrong').textContent = summary.wrongCount !== undefined ? summary.wrongCount : '—';
  document.getElementById('resUnanswered').textContent = summary.unansweredCount !== undefined ? summary.unansweredCount : '—';
  document.getElementById('resTimeTaken').textContent = summary.timeTaken || '—';
}

function setupStarRating() {
  const stars = document.querySelectorAll('#starRating .star');
  
  function updateStarColors(rating) {
    stars.forEach((s) => {
      const r = Number(s.getAttribute('data-rating'));
      if (r <= rating) {
        s.classList.add('selected');
      } else {
        s.classList.remove('selected');
      }
    });
  }

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      selectedRating = Number(star.getAttribute('data-rating'));
      updateStarColors(selectedRating);
    });

    star.addEventListener('mouseover', () => {
      const hoverRating = Number(star.getAttribute('data-rating'));
      stars.forEach((s) => {
        if (Number(s.getAttribute('data-rating')) <= hoverRating) {
          s.classList.add('hovered');
        } else {
          s.classList.remove('hovered');
        }
      });
    });

    star.addEventListener('mouseout', () => {
      stars.forEach((s) => s.classList.remove('hovered'));
    });
  });

  updateStarColors(selectedRating);
}

async function submitReview() {
  if (!currentExamId) {
    API.showToast('Exam reference not found.', 'error');
    return;
  }

  const reviewText = document.getElementById('feedbackText').value.trim();
  const btn = document.getElementById('btnSubmitReview');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    await API.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        examId: currentExamId,
        rating: selectedRating,
        review: reviewText
      })
    });

    document.getElementById('reviewFeedbackMessage').textContent = '✓ Thank you! Your review has been saved in Excel.';
    API.showToast('Feedback submitted successfully!', 'success');
    btn.style.display = 'none';
    document.getElementById('feedbackText').disabled = true;
  } catch (err) {
    API.showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Review →';
  }
}
