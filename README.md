# 🎓 NBKRIST College Online Examination System

A comprehensive, local online examination portal developed for **N.B.K.R. Institute of Science & Technology (NBKRIST)**.

---

## 📌 Project Overview
This portal provides a complete institutional examination environment where:
- **Administrators / Faculty** can manage students, build MCQs with correct answers, publish exams, monitor real-time attendance, inspect student answers, analyze reviews, and download live Excel grade sheets.
- **Students** can log in, view scheduled tests, read regulations, attend exams with a synchronized countdown timer and question navigator palette, receive instantaneous score evaluations, submit reviews, and receive email scorecards.
- **Excel Database**: All records are persistently stored in a structured multi-sheet Excel workbook (`backend/data/exam_data.xlsx`).

---

## 🛠 Technology Stack
* **Frontend**: Semantic HTML5, Modern Vanilla CSS3 (Custom Design System, Glassmorphism, Responsive Grid), Vanilla JavaScript (No heavy frameworks or compilation lag).
* **Backend**: Node.js & Express.js (Single local server architecture serving both frontend and REST APIs on `http://localhost:3000`).
* **Database**: Microsoft Excel `.xlsx` managed via **ExcelJS** with in-memory caching and resilient Windows file-lock handling.
* **Authentication & Security**: JSON Web Tokens (JWT), `bcryptjs` password encryption, server-side timer integrity, answer-key masking.
* **Notifications**: Nodemailer for automated HTML email scorecard delivery.

---

## 🚀 Getting Started

### 1. Installation
All dependencies are already installed. If running on a new machine:
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will boot up and print:
```
🎓 NBKRIST Online Examination System is LIVE!
🌐 Server running at: http://localhost:3000
📊 Excel Database:    ...\backend\data\exam_data.xlsx
👨‍💼 Admin Login:      admin / admin123
👨‍🎓 Student Logins:   rahul01, priya02, arjun03 (pwd: student123)
```

### 3. Open in Browser
Visit **`http://localhost:3000`** in Google Chrome or any modern browser.

---

## 🔑 Default Credentials

| Role | Username / ID | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full administrative control & Excel download |
| **Student 1** | `rahul01` | `student123` | Roll No: `ST001` (Rahul Kumar) |
| **Student 2** | `priya02` | `student123` | Roll No: `ST002` (Priya Sharma) |
| **Student 3** | `arjun03` | `student123` | Roll No: `ST003` (Arjun Reddy) |

*(One-click quick-fill buttons are also available right on the login screen for rapid testing).*

---

## 📊 Excel Database Sheets (`backend/data/exam_data.xlsx`)

The system creates and maintains the following sheets automatically:
1. **`Students`**: `Student ID`, `Name`, `Username`, `Email`, `Password Hash`, `Status`, `Created At`
2. **`Exams`**: `Exam ID`, `Exam Name`, `Description`, `Duration`, `Questions`, `Total Marks`, `Pass Marks`, `Status`, `Start Date`, `End Date`
3. **`Questions`**: `Exam ID`, `Q.No`, `Question`, `A`, `B`, `C`, `D`, `Answer`, `Marks`
4. **`Results`**: `Result ID`, `Student ID`, `Exam ID`, `Start`, `End`, `Time`, `Marks`, `%`, `Result`, `Submitted At`
5. **`Responses`**: `Result ID`, `Student ID`, `Exam ID`, `Q.No`, `Selected`, `Correct`, `Status`
6. **`Reviews`**: `Review ID`, `Student ID`, `Exam ID`, `Rating`, `Review`, `Date`

---

## 🛡 Anti-Cheat & Security Safeguards
1. **Server-Side Evaluation**: Correct answer keys are **never sent** to the student's browser during the test.
2. **Synchronized Server Clock**: The countdown timer is tracked on the server. Refreshing or closing the tab **does not** reset the timer.
3. **Single Attempt Enforcement**: Once an exam is submitted, subsequent attempts for that student are automatically blocked.
4. **Tab Switch & Copy Protection**: Right-click context menus are disabled, key combinations like `Ctrl+C` are suppressed, and switching tabs prompts an instant proctoring violation banner.
5. **Auto-Submit on Timeout**: When the countdown timer hits `00:00`, answers are locked and sent to the server for evaluation.

---

## 📧 Email Scorecard Configuration (Optional)
To send live emails to students, configure your SMTP credentials in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_college_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="NBKRIST Exam Cell <noreply@nbkrist.ac.in>"
```
*(If credentials are left blank, the system simulates and logs the email delivery cleanly in the console without throwing errors).*
