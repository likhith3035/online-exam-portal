// NBKRIST Examination Portal - Universal Smart Question Importer & AI Detection Engine

const SmartParser = {
  // Generate optimized prompt for ChatGPT / Claude / Gemini
  generatePrompt(topic = 'Data Structures', count = 10, difficulty = 'Medium') {
    return `Generate ${count} multiple-choice questions (${difficulty} difficulty) for engineering college students on the topic: "${topic}".

Format each question strictly in this format with NO extra commentary:

1. [Write question statement here]
A) [Option A text]
B) [Option B text]
C) [Option C text]
D) [Option D text]
Answer: [A or B or C or D]
Marks: 1

Repeat for all ${count} questions.`;
  },

  // Sample demo text for instant testing
  getSampleText() {
    return `1. Which data structure is used for Breadth First Search (BFS) graph traversal?
A) Stack
B) Queue
C) Priority Queue
D) Circular Linked List
Answer: B
Marks: 1

2. What is the average-case time complexity of Quick Sort?
A) O(n)
B) O(log n)
C) O(n log n)
D) O(n^2)
Answer: C
Marks: 1

3. In an AVL Tree, what is the maximum allowed balance factor for any node?
A) 0
B) 1
C) 2
D) 3
Answer: B
Marks: 1

4. Which algorithm is used to find the Shortest Path from a single source in a weighted graph with non-negative edges?
A) Prim's Algorithm
B) Kruskal's Algorithm
C) Dijkstra's Algorithm
D) Bellman-Ford Algorithm
Answer: C
Marks: 1

5. What happens when an element is pushed into a full stack array?
A) Underflow
B) Overflow
C) Segmentation Fault
D) Memory Leak
Answer: B
Marks: 1`;
  },

  // Helper to clean lines (strips leading markdown bullets, hashes, bold asterisks)
  cleanLine(l) {
    if (!l) return '';
    return l
      .replace(/^[\s\*\-\•\>\#\~]+/g, '')
      .replace(/[\*\_]+$/g, '')
      .trim();
  },

  isOptionLine(line, currentQ = null) {
    const cleaned = this.cleanLine(line);
    // Explicit letter options: A., A), (A), [A], A:, Option A, Option A:
    if (/^(?:Option\s*)?[\(\[]?([A-Da-d])[\)\]\.\:\-]\s*(.+)/i.test(cleaned)) return true;
    if (/^Option\s+([A-Da-d])\b/i.test(cleaned)) return true;

    // Numbered options when a question is active: 1), (1), [1], Option 1:
    if (currentQ && currentQ.question) {
      if (!currentQ.optionA && /^(?:Option\s*)?[\(\[]?1[\)\]\:\-]\s*(.+)/i.test(cleaned)) return true;
      if (currentQ.optionA && !currentQ.optionB && /^(?:Option\s*)?[\(\[]?2[\)\]\:\-]\s*(.+)/i.test(cleaned)) return true;
      if (currentQ.optionB && !currentQ.optionC && /^(?:Option\s*)?[\(\[]?3[\)\]\:\-]\s*(.+)/i.test(cleaned)) return true;
      if (currentQ.optionC && !currentQ.optionD && /^(?:Option\s*)?[\(\[]?4[\)\]\:\-]\s*(.+)/i.test(cleaned)) return true;
    }
    return false;
  },

  isAnswerLine(line) {
    const cleaned = this.cleanLine(line);
    return /^(?:Correct(?:\s*(?:Answer|Option|Choice))?|Ans(?:wer)?|Key|Option|Choice|Right\s*Answer|Solution|Option\s*[A-Da-d1-4]\s*is\s*correct)\b/i.test(cleaned);
  },

  isQuestionStart(line, nextLine) {
    const cleaned = this.cleanLine(line);
    // Explicit question markers: e.g. "1. ...", "Q1. ...", "Question 1: ...", "#1 ..."
    if (/^(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\-\)]\s*(.+)/i.test(cleaned)) return true;
    if (/^(?:Question|Problem|Q)\s*[\:\-\.]\s*(.+)/i.test(cleaned)) return true;

    // Line without question number, but immediately followed by Option A or (A) or 1)
    if (nextLine && !this.isOptionLine(line, null) && !this.isAnswerLine(line)) {
      const nextClean = this.cleanLine(nextLine);
      if (/^(?:Option\s*)?[\(\[]?(?:A|1)[\)\]\.\:\-](.+)/i.test(nextClean)) {
        return true;
      }
    }
    return false;
  },

  /**
   * Universal Smart Parser:
   * Parses free-form text from ChatGPT, Gemini, Claude, Word, PDFs, or manual notes into structured MCQs.
   */
  parseText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // 1. Check if user pasted tab-delimited or spreadsheet tabular rows (copied directly from Excel/Sheets)
    const linesRaw = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const hasTabs = linesRaw.some(l => l.split('\t').length >= 3);
    if (hasTabs) {
      const tsvParsed = this.parseSpreadsheetRows(linesRaw.map(l => l.split('\t')));
      if (tsvParsed.length > 0) return tsvParsed;
    }

    // 2. Pre-process: split lines that contain multiple inline options (e.g. "A) Cat  B) Dog  C) Fish  D) Bird")
    const normalizedLines = [];
    for (const rawLine of linesRaw) {
      const multiOptRegex = /(?:\b|[\(\[])([A-Da-d])[\.\:\)\-\]]([^\(\[\n\r]+?)(?=(?:[\(\[]?[A-Da-d][\.\:\)\-\]]|$))/g;
      const matches = [...rawLine.matchAll(multiOptRegex)];
      if (matches.length >= 2) {
        for (const m of matches) {
          normalizedLines.push(`${m[1]}) ${m[2].trim()}`);
        }
      } else {
        normalizedLines.push(rawLine);
      }
    }

    const questions = [];
    let currentQ = null;

    const finalizeCurrent = () => {
      if (currentQ && currentQ.question) {
        // Resolve textual answers if user wrote "Answer: Queue" instead of "Answer: B"
        if (currentQ.correctAnswerText && !currentQ.correctAnswer) {
          const ansText = currentQ.correctAnswerText.trim();
          const cleanAns = ansText.replace(/^[\(\[\s]+|[\)\]\.\s]+$/g, '').toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(cleanAns)) {
            currentQ.correctAnswer = cleanAns;
          } else if (['1', '2', '3', '4'].includes(cleanAns)) {
            const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
            currentQ.correctAnswer = map[cleanAns];
          } else {
            // Textual match against options:
            const lowerAns = ansText.toLowerCase();
            if (currentQ.optionA && currentQ.optionA.trim().toLowerCase() === lowerAns) currentQ.correctAnswer = 'A';
            else if (currentQ.optionB && currentQ.optionB.trim().toLowerCase() === lowerAns) currentQ.correctAnswer = 'B';
            else if (currentQ.optionC && currentQ.optionC.trim().toLowerCase() === lowerAns) currentQ.correctAnswer = 'C';
            else if (currentQ.optionD && currentQ.optionD.trim().toLowerCase() === lowerAns) currentQ.correctAnswer = 'D';
            // Substring match
            else if (currentQ.optionA && currentQ.optionA.toLowerCase().includes(lowerAns)) currentQ.correctAnswer = 'A';
            else if (currentQ.optionB && currentQ.optionB.toLowerCase().includes(lowerAns)) currentQ.correctAnswer = 'B';
            else if (currentQ.optionC && currentQ.optionC.toLowerCase().includes(lowerAns)) currentQ.correctAnswer = 'C';
            else if (currentQ.optionD && currentQ.optionD.toLowerCase().includes(lowerAns)) currentQ.correctAnswer = 'D';
            else currentQ.correctAnswer = 'A';
          }
        }

        if (!currentQ.correctAnswer) {
          currentQ.correctAnswer = 'A';
        }

        // Fill empty options if only A and B were provided (e.g. True / False)
        if (currentQ.optionA && currentQ.optionB && !currentQ.optionC) {
          currentQ.optionC = 'Both A and B';
        }
        if (currentQ.optionA && currentQ.optionB && !currentQ.optionD) {
          currentQ.optionD = 'None of the above';
        }

        currentQ.isValid = !!(
          currentQ.question &&
          currentQ.optionA &&
          currentQ.optionB
        );

        if (currentQ.isValid) {
          questions.push(currentQ);
        }
      }
      currentQ = null;
    };

    for (let i = 0; i < normalizedLines.length; i++) {
      const rawLine = normalizedLines[i];
      const cleaned = this.cleanLine(rawLine);
      if (!cleaned) continue;

      // Skip markdown headers (# ... or ### ...)
      if (/^#{1,6}\s+/.test(rawLine.trim())) continue;

      // Skip document instructions or metadata lines
      if (/^(?:instructions?|section\s+[a-z0-9]|part\s+[a-z0-9]|time\s*[\:\-]|duration|total\s*marks?|note\s*[\:\-])/i.test(cleaned)) continue;

      const isQActive = !!(currentQ && currentQ.question);

      // Check if line is an Option for currently active question FIRST
      // This ensures 1), 2), 3), 4) or A), B), C), D) are captured as options rather than new questions
      if (isQActive && this.isOptionLine(rawLine, currentQ)) {
        const optMatch = cleaned.match(/^(?:Option\s*)?[\(\[]?([A-Da-d1-4])[\)\]\.\:\-]\s*(.+)/i)
          || cleaned.match(/^Option\s+([A-Da-d1-4])\s*[\:\.\-]?\s*(.+)/i);
        if (optMatch) {
          const rawCode = optMatch[1].toUpperCase();
          const codeMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D' };
          const letter = codeMap[rawCode] || 'A';
          let optText = optMatch[2].trim().replace(/^\*\*|\*\*$/g, '');

          if (letter === 'A' && !currentQ.optionA) currentQ.optionA = optText;
          else if (letter === 'B' && !currentQ.optionB) currentQ.optionB = optText;
          else if (letter === 'C' && !currentQ.optionC) currentQ.optionC = optText;
          else if (letter === 'D' && !currentQ.optionD) currentQ.optionD = optText;
          continue;
        }
      }

      // Check if line is Answer
      if (isQActive && this.isAnswerLine(rawLine)) {
        const ansMatch = cleaned.match(/^(?:Correct(?:\s*(?:Answer|Option|Choice))?|Ans(?:wer)?|Key|Option|Choice|Right\s*Answer|Solution)\s*[\:\-\=\s]\s*(.+)/i)
          || cleaned.match(/^(?:Option\s*)?\(?([A-Da-d1-4])\)?\s*is\s*correct/i);
        if (ansMatch) {
          const rawAns = ansMatch[1].trim().replace(/^\*\*|\*\*$/g, '');
          const letterMatch = rawAns.match(/^(?:Option\s*)?\(?([A-Da-d1-4])\)?[\.\:\)]?$/i);
          if (letterMatch) {
            const matched = letterMatch[1].toUpperCase();
            const codeMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D' };
            currentQ.correctAnswer = codeMap[matched] || 'A';
          } else {
            currentQ.correctAnswerText = rawAns;
          }
          continue;
        }
      }

      // Check Marks
      if (isQActive) {
        const marksMatch = cleaned.match(/^Marks?\s*[\:\-\=]?\s*(\d+)/i);
        if (marksMatch) {
          currentQ.marks = Number(marksMatch[1]) || 1;
          continue;
        }
      }

      // Check if line starts a new question
      if (this.isQuestionStart(rawLine, normalizedLines[i + 1])) {
        // If currentQ exists but never got any options, it was an accidental title / preamble, so discard it
        if (currentQ && (!currentQ.optionA || !currentQ.optionB)) {
          currentQ = null;
        } else {
          finalizeCurrent();
        }

        let qText = cleaned
          .replace(/^(?:Q(?:uestion)?\.?\s*)?\d+[\.\:\-\)]\s*/i, '')
          .replace(/^(?:Question|Problem|Q)\s*[\:\-\.]\s*/i, '')
          .replace(/^\*\*|\*\*$/g, '')
          .trim();

        currentQ = {
          qNo: questions.length + 1,
          question: qText || cleaned,
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctAnswer: '',
          correctAnswerText: '',
          marks: 1
        };
        continue;
      }

      // If no question active yet, check if this line is an unnumbered question statement
      if (!currentQ) {
        if (!this.isOptionLine(rawLine, null) && !this.isAnswerLine(rawLine) && cleaned.length > 3) {
          currentQ = {
            qNo: questions.length + 1,
            question: cleaned.replace(/^\*\*|\*\*$/g, ''),
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            correctAnswer: '',
            correctAnswerText: '',
            marks: 1
          };
        }
        continue;
      }

      // Continuation of question statement before Option A is encountered
      if (!currentQ.optionA) {
        currentQ.question += ' ' + cleaned.replace(/^\*\*|\*\*$/g, '');
      }
    }


    finalizeCurrent();
    return questions;
  },

  /**
   * Parse Excel Workbook (.xlsx, .xls) using SheetJS
   */
  parseExcel(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS XLSX library is still loading. Please check your internet connection or use text paste.');
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    return this.parseSpreadsheetRows(rows);
  },

  /**
   * Universal Spreadsheet Rows Parser (works for XLSX, CSV, TSV)
   */
  parseSpreadsheetRows(rows) {
    if (!rows || rows.length === 0) return [];

    const nonEmptyRows = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c).trim().length > 0));
    if (nonEmptyRows.length === 0) return [];

    let startIndex = 0;
    let colQ = -1, colA = -1, colB = -1, colC = -1, colD = -1, colAns = -1, colMarks = -1;

    // Detect column header names
    const headerRow = nonEmptyRows[0].map((c) => String(c).toLowerCase().trim());
    const hasHeader = headerRow.some((c) => /question|statement|prob|option|opt|choice|ans|correct|mark/i.test(c));

    if (hasHeader) {
      startIndex = 1;
      headerRow.forEach((h, idx) => {
        // Skip Serial Number / ID columns
        if (/^(?:s\.?\s*no\.?|sl\.?\s*no\.?|sno|serial|id|\#|q\.?\s*no\.?|qno)$/i.test(h)) return;

        if (/(?:question|problem|statement|title|mcq|desc)/i.test(h)) {
          if (colQ === -1) colQ = idx;
        }
        else if (/(?:option\s*[a1]|opt\s*[a1]|choice\s*[a1]|^a$|^1$)/i.test(h)) colA = idx;
        else if (/(?:option\s*[b2]|opt\s*[b2]|choice\s*[b2]|^b$|^2$)/i.test(h)) colB = idx;
        else if (/(?:option\s*[c3]|opt\s*[c3]|choice\s*[c3]|^c$|^3$)/i.test(h)) colC = idx;
        else if (/(?:option\s*[d4]|opt\s*[d4]|choice\s*[d4]|^d$|^4$)/i.test(h)) colD = idx;
        else if (/(?:correct|ans|key|solution|right)/i.test(h)) colAns = idx;
        else if (/(?:marks?|score|points|weightage)/i.test(h)) colMarks = idx;
      });
    }

    // Fallbacks if columns were not explicitly matched by headers
    if (colQ === -1) {
      // Check if first column looks like a serial number (1, 2, 3...)
      const sampleRow = nonEmptyRows[startIndex] || [];
      if (sampleRow.length >= 6 && /^\d+$/.test(String(sampleRow[0]).trim())) {
        colQ = 1; colA = 2; colB = 3; colC = 4; colD = 5; colAns = 6; colMarks = 7;
      } else {
        colQ = 0; colA = 1; colB = 2; colC = 3; colD = 4; colAns = 5; colMarks = 6;
      }
    }
    if (colA === -1) colA = colQ + 1;
    if (colB === -1) colB = colA + 1;
    if (colC === -1) colC = colB + 1;
    if (colD === -1) colD = colC + 1;
    if (colAns === -1) colAns = colD + 1;
    if (colMarks === -1) colMarks = colAns + 1;

    const questions = [];
    for (let i = startIndex; i < nonEmptyRows.length; i++) {
      const row = nonEmptyRows[i];
      const qText = String(row[colQ] || '').trim();
      const optA = String(row[colA] || '').trim();
      const optB = String(row[colB] || '').trim();
      const optC = String(row[colC] || (optA && optB ? 'Both A and B' : '')).trim();
      const optD = String(row[colD] || (optA && optB ? 'None of the above' : '')).trim();

      let rawAns = String(row[colAns] || 'A').trim().toUpperCase();
      let ans = 'A';
      if (rawAns === '1') ans = 'A';
      else if (rawAns === '2') ans = 'B';
      else if (rawAns === '3') ans = 'C';
      else if (rawAns === '4') ans = 'D';
      else if (['A', 'B', 'C', 'D'].includes(rawAns)) ans = rawAns;
      else {
        const letterMatch = rawAns.match(/(?:OPTION\s*)?\(?([A-D1-4])\)?/i);
        if (letterMatch) {
          const matched = letterMatch[1].toUpperCase();
          const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
          ans = map[matched] || matched;
        } else {
          if (optA && optA.toUpperCase().includes(rawAns)) ans = 'A';
          else if (optB && optB.toUpperCase().includes(rawAns)) ans = 'B';
          else if (optC && optC.toUpperCase().includes(rawAns)) ans = 'C';
          else if (optD && optD.toUpperCase().includes(rawAns)) ans = 'D';
          else ans = 'A';
        }
      }

      const marks = Number(row[colMarks]) || 1;

      if (qText && optA && optB) {
        questions.push({
          qNo: questions.length + 1,
          question: qText,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          correctAnswer: ans,
          marks,
          isValid: true
        });
      }
    }

    return questions;
  },

  /**
   * Parse CSV content with comma, tab or semicolon delimiters
   */
  parseCSV(csvText) {
    if (!csvText || !csvText.trim()) return [];

    // Auto-detect delimiter
    const firstLine = csvText.split('\n')[0] || '';
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows = lines.map((line) => {
      // Split preserving quoted items
      const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]*))`, 'g');
      const row = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        row.push((match[1] !== undefined ? match[1] : match[2] || '').trim());
      }
      return row;
    });

    return this.parseSpreadsheetRows(rows);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartParser;
}

