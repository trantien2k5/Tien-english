import { askAI } from '../../services/ai.js';
import { Storage } from '../../services/storage.js';

export default {
    currentQuestions: [],

    init() {
        // Gắn sự kiện nút Tạo bài
        document.getElementById('btn-gen-reading').addEventListener('click', () => this.generateReading());
    },

    async generateReading() {
        const topic = document.getElementById('read-topic').value || 'Technology';
        const level = document.getElementById('read-level').value;
        const goal = document.getElementById('read-goal').value;

        // UI Loading
        document.getElementById('reading-setup').style.display = 'none';
        document.getElementById('reading-loader').style.display = 'block';

        // Prompt "Deep Learning"
        const prompt = `
            Create a reading lesson. Topic: "${topic}". Level: ${level}. Goal: ${goal}.
            Role: IELTS Examiner.
            Return valid JSON ONLY (No markdown):
            {
                "title": "Topic Title",
                "content_html": "<p>Para 1 with <span class='vocab-highlight'>hard word</span>...</p>",
                "questions": [
                    { 
                        "id": "q1", "q": "Question text?", "opts": ["Option A","Option B","Option C"], 
                        "ans": 0, "explain": "Explain why A is correct." 
                    }
                ],
                "glossary": [ { "term": "hard word", "type": "adj", "meaning": "Vietnamese definition" } ]
            }
            Ensure 3 challenging questions.
        `;

        try {
            const raw = await askAI(prompt, "You are a Reading Generator JSON API.");
            const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
            this.renderReading(data);
        } catch (e) {
            alert("Lỗi AI: " + e.message);
            location.reload();
        }
    },

    renderReading(data) {
        this.currentQuestions = data.questions;
        
        document.getElementById('reading-loader').style.display = 'none';
        document.getElementById('reading-interface').style.display = 'block';

        document.getElementById('r-title').innerText = data.title;
        document.getElementById('r-content').innerHTML = data.content_html;

        // Render câu hỏi
        const qContainer = document.getElementById('r-questions');
        qContainer.innerHTML = data.questions.map((q, i) => `
            <div class="quiz-item">
                <div style="font-weight:600; margin-bottom:10px"><b>Q${i+1}:</b> ${q.q}</div>
                <div class="quiz-options">
                    ${q.opts.map(opt => `<div class="option-btn" onclick="this.classList.toggle('selected')">${opt}</div>`).join('')}
                </div>
            </div>
        `).join('');

        // Render từ vựng
        if(data.glossary?.length) {
            const glossHtml = data.glossary.map(w => `<li><b>${w.term}</b> <i>(${w.type})</i>: ${w.meaning}</li>`).join('');
            qContainer.insertAdjacentHTML('beforeend', `<div class="glossary-box"><h4>📖 Từ vựng mới:</h4><ul>${glossHtml}</ul></div>`);
        }

        // Gắn sự kiện Nộp bài
        document.getElementById('btn-submit-reading').onclick = () => this.checkResults();
    },

    checkResults() {
        let score = 0;
        const items = document.querySelectorAll('.quiz-item');

        this.currentQuestions.forEach((q, i) => {
            const item = items[i];
            const opts = item.querySelectorAll('.option-btn');
            const selected = item.querySelector('.selected');

            // Reset & Highlight
            opts.forEach(o => o.classList.remove('correct', 'wrong'));
            opts[q.ans].classList.add('correct'); // Luôn hiện đáp án đúng

            if (selected) {
                // Check user answer
                const idx = Array.from(opts).indexOf(selected);
                if (idx === q.ans) score++;
                else selected.classList.add('wrong');
            }

            // Hiện giải thích
            if(!item.querySelector('.explain-box')) {
                item.insertAdjacentHTML('beforeend', `<div class="explain-box">💡 ${q.explain}</div>`);
            }
        });

        alert(`Kết quả: ${score}/${this.currentQuestions.length} câu đúng! 🎉`);
    }
};