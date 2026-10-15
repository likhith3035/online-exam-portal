// NBKRIST Examination Portal - Official Certificate Generator Engine
// Renders student credentials onto the official institutional certificate template

const CertificateGenerator = {
  templateUrl: 'images/certificate_template.jpg',
  templateImg: null,
  imgLoaded: false,
  currentData: {
    studentName: '',
    rollNo: '',
    department: '',
    examTitle: '',
    date: ''
  },

  init() {
    if (!this.templateImg) {
      this.templateImg = new Image();
      this.templateImg.crossOrigin = 'anonymous';
      this.templateImg.src = this.templateUrl;
      this.templateImg.onload = () => {
        this.imgLoaded = true;
        if (document.getElementById('certCanvas')) {
          this.draw();
        }
      };
    }
    this.ensureModal();
  },

  ensureModal() {
    if (document.getElementById('nbkristCertModal')) return;

    const modalHtml = `
    <div id="nbkristCertModal" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(6px); z-index: 9999; overflow-y: auto; padding: 24px 16px;">
      <div style="background: #ffffff; max-width: 1060px; margin: 20px auto; border-radius: 18px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35); overflow: hidden; border: 1px solid rgba(226, 232, 240, 0.8);">
        
        <!-- MODAL HEADER -->
        <div style="background: linear-gradient(135deg, #0b1f3a 0%, #173866 100%); color: #ffffff; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d4af37;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="font-size: 28px;">🎓</div>
            <div>
              <h3 style="margin: 0; font-family: var(--font-display, 'Outfit', sans-serif); font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                NBKRIST Official Examination Certificate
              </h3>
              <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">
                Verify your credentials below. The certificate will update live in real-time.
              </p>
            </div>
          </div>
          <button type="button" onclick="CertificateGenerator.closeModal()" style="background: rgba(255, 255, 255, 0.15); border: none; color: #ffffff; font-size: 20px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" title="Close">✕</button>
        </div>

        <!-- MODAL BODY -->
        <div style="padding: 24px 28px;">
          
          <!-- CREDENTIALS INPUT FORM -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">
            <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span>✍️</span> Confirm Student Details for Certificate Printing:
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Candidate Full Name *</label>
                <input type="text" id="certInputName" class="form-control" style="font-weight: 600; text-transform: uppercase;" placeholder="e.g. RAHUL KUMAR" oninput="CertificateGenerator.onFieldChange()">
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Roll No. / Hall Ticket *</label>
                <input type="text" id="certInputRoll" class="form-control" style="font-weight: 600; text-transform: uppercase;" placeholder="e.g. 21AK1A0501" oninput="CertificateGenerator.onFieldChange()">
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Department / Branch *</label>
                <input type="text" id="certInputDept" list="certDeptList" class="form-control" style="font-weight: 600;" placeholder="e.g. Computer Science & Engineering" oninput="CertificateGenerator.onFieldChange()">
                <datalist id="certDeptList">
                  <option value="Computer Science & Engineering">
                  <option value="Artificial Intelligence & Data Science">
                  <option value="Electronics & Communication Engineering">
                  <option value="Electrical & Electronics Engineering">
                  <option value="Mechanical Engineering">
                  <option value="Civil Engineering">
                  <option value="Information Technology">
                </datalist>
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Examination Title *</label>
                <input type="text" id="certInputExam" class="form-control" style="font-weight: 600;" placeholder="e.g. Data Structures & Algorithms Online Examination" oninput="CertificateGenerator.onFieldChange()">
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Examination Date *</label>
                <input type="text" id="certInputDate" class="form-control" style="font-weight: 600;" placeholder="e.g. 08 October 2026" oninput="CertificateGenerator.onFieldChange()">
              </div>
            </div>
          </div>

          <!-- LIVE CANVAS PREVIEW CONTAINER -->
          <div style="background: #0f172a; padding: 18px; border-radius: 14px; text-align: center; box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.4); margin-bottom: 22px;">
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 10px; font-weight: 600; letter-spacing: 0.5px;">
              👁️ LIVE PRINT PREVIEW (Superimposed High-Definition Vector Output)
            </div>
            <div style="position: relative; display: inline-block; max-width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
              <canvas id="certCanvas" width="2048" height="1364" style="width: 100%; max-width: 960px; height: auto; display: block; background: #fff;"></canvas>
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 13px; color: #64748b;">
              🔒 Digitally authenticated by NBKRIST Online Examination System
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button type="button" class="btn btn-secondary" onclick="CertificateGenerator.closeModal()">
                Close
              </button>
              <button type="button" class="btn btn-outline" style="border-color: #0f2e5a; color: #0f2e5a; font-weight: 700;" onclick="CertificateGenerator.printCertificate()">
                🖨️ Print / Save PDF
              </button>
              <button type="button" class="btn btn-primary btn-lg" style="background: linear-gradient(135deg, #0b1f3a 0%, #1e40af 100%); font-weight: 700;" onclick="CertificateGenerator.downloadCertificate()">
                📥 Download Certificate (HD PNG) 🚀
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  openModal(data = {}) {
    this.init();

    // Fill current data
    const user = (typeof API !== 'undefined' && API.checkAuth) ? API.checkAuth() : null;

    const formattedToday = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    this.currentData = {
      studentName: data.studentName || (user ? user.name : '') || 'CANDIDATE NAME',
      rollNo: data.rollNo || (user ? (user.id || user.username) : '') || '21AK1A0501',
      department: data.department || (user ? user.department : '') || 'Computer Science & Engineering',
      examTitle: data.examTitle || data.examName || 'Online Examination',
      date: data.date || formattedToday
    };

    // Update input elements
    document.getElementById('certInputName').value = this.currentData.studentName;
    document.getElementById('certInputRoll').value = this.currentData.rollNo;
    document.getElementById('certInputDept').value = this.currentData.department;
    document.getElementById('certInputExam').value = this.currentData.examTitle;
    document.getElementById('certInputDate').value = this.currentData.date;

    const modal = document.getElementById('nbkristCertModal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }

    if (this.imgLoaded) {
      this.draw();
    } else {
      // Retry loading if needed
      this.templateImg.onload = () => {
        this.imgLoaded = true;
        this.draw();
      };
    }
  },

  closeModal() {
    const modal = document.getElementById('nbkristCertModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  },

  onFieldChange() {
    this.currentData.studentName = (document.getElementById('certInputName').value || '').trim();
    this.currentData.rollNo = (document.getElementById('certInputRoll').value || '').trim();
    this.currentData.department = (document.getElementById('certInputDept').value || '').trim();
    this.currentData.examTitle = (document.getElementById('certInputExam').value || '').trim();
    this.currentData.date = (document.getElementById('certInputDate').value || '').trim();
    this.draw();
  },

  draw() {
    const canvas = document.getElementById('certCanvas');
    if (!canvas || !this.templateImg || !this.imgLoaded) return;

    const ctx = canvas.getContext('2d');
    const W = 2048;
    const H = 1364;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.templateImg, 0, 0, W, H);

    const name = this.currentData.studentName || 'STUDENT NAME';
    const roll = this.currentData.rollNo || 'ROLL NO';
    const dept = this.currentData.department || 'DEPARTMENT';
    const exam = this.currentData.examTitle || 'EXAMINATION';
    const date = this.currentData.date || '';

    // Color: Official deep navy tone matching the NBKRIST certificate template
    ctx.fillStyle = '#0a2240';

    // 1. Candidate Full Name
    // Base 1024x682: X=518, Y=336 => 2x: X=1036, Y=672
    let nameFontSize = 44;
    ctx.font = `bold ${nameFontSize}px "Times New Roman", Georgia, serif`;
    while (ctx.measureText(name.toUpperCase()).width > 920 && nameFontSize > 26) {
      nameFontSize -= 2;
      ctx.font = `bold ${nameFontSize}px "Times New Roman", Georgia, serif`;
    }
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 1036, 672);

    // 2. Roll Number
    // Base 1024x682: X=350, Y=374 => 2x: X=700, Y=748
    ctx.font = 'bold 30px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(roll.toUpperCase(), 700, 748);

    // 3. Department
    // Base 1024x682: X=772, Y=374 => 2x: X=1544, Y=748
    let deptFontSize = 28;
    ctx.font = `bold ${deptFontSize}px "Times New Roman", Georgia, serif`;
    while (ctx.measureText(dept).width > 490 && deptFontSize > 18) {
      deptFontSize -= 2;
      ctx.font = `bold ${deptFontSize}px "Times New Roman", Georgia, serif`;
    }
    ctx.textAlign = 'center';
    ctx.fillText(dept, 1544, 748);

    // 4. Examination Title
    // Base 1024x682: X=527, Y=423 => 2x: X=1054, Y=846
    let examFontSize = 30;
    ctx.font = `bold ${examFontSize}px "Times New Roman", Georgia, serif`;
    while (ctx.measureText(exam).width > 760 && examFontSize > 18) {
      examFontSize -= 2;
      ctx.font = `bold ${examFontSize}px "Times New Roman", Georgia, serif`;
    }
    ctx.textAlign = 'center';
    ctx.fillText(exam, 1054, 846);

    // 5. Date
    // Base 1024x682: X=519, Y=482 => 2x: X=1038, Y=964
    ctx.font = 'bold 28px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(date, 1038, 964);
  },

  downloadCertificate() {
    const canvas = document.getElementById('certCanvas');
    if (!canvas) return;

    const roll = (this.currentData.rollNo || 'NBKRIST').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const link = document.createElement('a');
    link.download = `NBKRIST_Certificate_${roll}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();

    if (typeof API !== 'undefined' && API.showToast) {
      API.showToast('🎉 Certificate downloaded successfully!', 'success');
    }
  },

  printCertificate() {
    const canvas = document.getElementById('certCanvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const roll = this.currentData.rollNo || 'NBKRIST';
    const name = this.currentData.studentName || 'Student';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up was blocked. Please allow pop-ups to print the certificate.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NBKRIST Certificate - ${name} (${roll})</title>
          <style>
            @page {
              size: landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #fff;
            }
            img {
              width: 100vw;
              height: 100vh;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print();" />
        </body>
      </html>
    `);
    printWin.document.close();
  }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    CertificateGenerator.init();
  });
}
