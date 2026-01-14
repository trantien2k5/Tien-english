import { askAI } from '../../services/ai.js';
import { Storage } from '../../services/storage.js'; // IMPORT MỚI
export default {
    currentData: null, // Lưu dữ liệu bài học hiện tại
    isSpeaking: false,

    init() {
        this.bindEvents();
        this.bindChipEvents(); // Handle Chips UI
        this.renderRecent();   // Show history
    },

    // PATCH_v2
    bindChipEvents() {
        const chips = document.querySelectorAll('.chip');
        const input = document.getElementById('listen-topic');
        
        // Window functions for HTML onClick
        window.listenMode = (mode) => this.switchMode(mode);

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                if(input) input.value = chip.dataset.val;
            });
        });
    },

    // --- NEW LOGIC: MODES & DASHBOARD ---
    switchMode(mode) {
        // UI Reset
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        // Find clicked card (simple logic based on order or passed element, here we just visual sync)
        
        const customUI = document.getElementById('custom-setup-ui');
        
        if (mode === 'custom') {
            customUI.style.display = 'block';
            window.scrollTo({ top: customUI.offsetTop, behavior: 'smooth' });
        } else if (mode === 'smart') {
            customUI.style.display = 'none';
            this.handleSmartStart();
        } else if (mode === 'review') {
            alert("Tính năng Ôn tập lỗi sai (Mistake Bank) sẽ có ở bản v2! 🛠️");
        }
    },

    handleSmartStart() {
        // AI Logic: Pick topic dựa trên History hoặc Random
        const topics = ["Ordering Food", "Airport Check-in", "Job Interview", "Making Friends", "Weather Talk"];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        
        // Auto-fill & Generate
        document.getElementById('listen-topic').value = randomTopic;
        
        // Hiệu ứng UX
        const btn = document.querySelector('.mode-card[onclick*="smart"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loader" style="width:20px;height:20px"></div> Đang chọn bài...`;
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            this.generateLesson(); // Call main function
        }, 800);
    },

    renderRecent() {
        const list = Storage.getHistory('listening'); // Lấy 200 items gần nhất
        const container = document.getElementById('recent-list');
        if(!container) return;

        if (list.length === 0) {
            container.innerHTML = '<p style="font-size:0.9rem; color:#999; text-align:center; padding:10px;">📭 Chưa có bài học nào. Tạo bài mới ngay!</p>';
            return;
        }

        // Lấy 3 bài gần nhất
        const recent3 = list.slice(0, 3);
        
        container.innerHTML = recent3.map(item => `
            <div class="recent-item" onclick="alert('Tính năng tiếp tục bài học sẽ cập nhật ở v2!')">
                <div class="recent-info">
                    <h5>${item.title}</h5>
                    <span>${new Date(item.createdAt).toLocaleDateString()} • ${item.content?.questions?.length || 3} câu hỏi</span>
                </div>
                <div class="recent-status">⏯</div>
            </div>
        `).join('');
    },

    bindEvents() {
        // 1. Nút Tạo bài
        document.getElementById('btn-gen-listen').addEventListener('click', () => this.generateLesson());

        // 2. Player Controls
        document.getElementById('btn-play').addEventListener('click', () => this.toggleAudio());
        
        // Speed Selector
        document.querySelectorAll('.speed-opt').forEach(opt => {
            opt.addEventListener('click', (e) => {
                document.querySelectorAll('.speed-opt').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Focus Mode
        document.getElementById('btn-focus-mode').addEventListener('click', () => {
            document.body.classList.toggle('focus-mode');
        });

        // 3. Toggle Transcript
        document.getElementById('btn-toggle-script').addEventListener('click', () => {
            const content = document.getElementById('script-content');
            const icon = document.querySelector('.ts-header i');
            const isHidden = content.style.display === 'none';
            
            content.style.display = isHidden ? 'block' : 'none';
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    },

    async generateLesson() {
        const topic = document.getElementById('listen-topic').value;
        const loader = document.getElementById('listen-loader');
        const listenArea = document.getElementById('listen-area');
        const quizArea = document.getElementById('quiz-area');

        // Reset UI
        listenArea.style.display = 'none';
        quizArea.style.display = 'none';
        loader.style.display = 'block';
        window.speechSynthesis.cancel(); // Dừng đọc cũ

        try {
            // --- PROMPT KỸ THUẬT (Updated v2: Level + SRS) ---
            const level = document.getElementById('listen-level').value;
            // PATCH_v2: Prompt nâng cấp - Tách câu hội thoại
            const prompt = `
                Create a listening lesson. Topic: "${topic}". Level: ${level}.
                Structure:
                1. Dialogue: 6-10 turns. Natural conversation.
                2. 3 Quiz questions (MCQ).
                3. 3 Key phrases for SRS.

                Return ONLY valid JSON:
                {
                    "topic_en": "English Topic Name",
                    "dialogue": [
                        {"speaker": "A", "text": "Hello, how are you?"},
                        {"speaker": "B", "text": "I'm good, thanks!"}
                    ],
                    "questions": [
                        { "q": "...", "options": ["A...", "B...", "C..."], "correct": 0, "explain": "..." }
                    ],
                    "srs_vocab": [
                        { "word": "...", "meaning": "...", "ipa": "/.../" }
                    ]
                }
            `;

            const rawResponse = await askAI(prompt, "You are an English teacher JSON API.");

            // Parse JSON từ AI (xử lý trường hợp AI trả về markdown code block)
            // PATCH_v2: Fix JSON Parse & Move Logic inside Try
            let jsonStr = rawResponse.replace(/```json|```/g, '').trim();
            // Lấy đúng phần JSON Object (tránh text thừa)
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace >= 0) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            this.currentData = JSON.parse(jsonStr);
            this.currentData.topic = document.getElementById('listen-topic').value;
            this.currentData.createdAt = new Date().toLocaleDateString();

            // Lưu Storage & History (Chỉ chạy khi parse thành công)
            Storage.addListeningHistory(this.currentData);
            Storage.addToHistory(
                'listening',
                this.currentData.topic,
                this.currentData,
                `Dialogue: ${this.currentData.dialogue?.[0]?.text || 'Audio lesson'}`
            );

            this.renderLesson();
            loader.style.display = 'none';
            listenArea.style.display = 'block';
            quizArea.style.display = 'block';

        } catch (err) {
            console.error("AI Gen Error:", err);
            loader.innerHTML = `<p class="text-danger" style="padding:20px">⚠️ Lỗi xử lý dữ liệu AI: ${err.message}<br>Hãy thử lại!</p>`;
        }


    },

    addToSRS(index) {
        const btn = document.getElementById(`btn-save-${index}`);
        const item = this.currentData.srs_vocab[index];
        if(!item) return;

        // Gọi Storage service
        Storage.addVocab({
            word: item.word,
            meaning: item.meaning,
            ipa: item.ipa || '',
            example: `<p>Context: <b>${this.currentData.topic_en || 'Listening Lesson'}</b></p>`,
            status: 'new',
            dueDate: Date.now(),
            interval: 0
        });

        // Feedback UI
        if(btn) {
            btn.innerHTML = '<span>✔ Đã lưu vào kho</span>';
            btn.classList.add('saved');
            btn.disabled = true;
        }
    },

    renderLesson() {
        // 0. Render SRS Vocab (Card UI)
        const vList = document.getElementById('vocab-extract-list');
        const vArea = document.getElementById('vocab-extract-area');
        
        if (vArea && this.currentData.srs_vocab) {
            vArea.style.display = 'block';
            vList.innerHTML = this.currentData.srs_vocab.map((w, i) => `
                <div class="vocab-card">
                    <div>
                        <div class="vc-top">
                            <span class="vc-word">${w.word}</span>
                            <span class="vc-ipa">${w.ipa || ''}</span>
                        </div>
                        <div class="vc-meaning">${w.meaning}</div>
                    </div>
                    <button id="btn-save-${i}" class="btn-srs-save" onclick="window.saveVocabSRS(${i})">
                        <span>＋ Lưu từ này</span>
                    </button>
                </div>
            `).join('');
            
            // Expose function
            window.saveVocabSRS = (i) => this.addToSRS(i);
        } else if (vArea) {
            vArea.style.display = 'none';
        }

        // 1. Render Smart Transcript (Chat Style)
        const scriptBox = document.getElementById('script-content');
        scriptBox.innerHTML = this.currentData.dialogue.map((line, idx) => `
            <div class="chat-row" onclick="window.playSentence(${idx})">
                <div class="speaker-tag ${line.speaker === 'A' ? 'sp-a' : 'sp-b'}">${line.speaker}</div>
                <div class="chat-text">${line.text}</div>
                <button class="btn-replay-line">🔊</button>
            </div>
        `).join('');
        
        // Expose function cho HTML gọi
        window.playSentence = (idx) => this.playSentence(idx);

        // 2. Render Quiz (Pro Interface)
        const container = document.getElementById('questions-container');
        container.innerHTML = ''; 

        this.currentData.questions.forEach((q, index) => {
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item';

            const optionsHtml = q.options.map((opt, optIndex) => `
                <div class="option-btn" onclick="window.handleQuizClick(this, ${index}, ${optIndex})">
                    ${opt}
                </div>
            `).join('');

            quizItem.innerHTML = `
                <div class="quiz-question"><span style="color:var(--color-primary)">Q${index + 1}:</span> ${q.q}</div>
                <div class="quiz-options" id="q-opts-${index}">${optionsHtml}</div>
                <div class="quiz-explain" id="explain-${index}">
                    💡 <strong>Giải thích:</strong> ${q.explain || 'Không có giải thích chi tiết.'}
                </div>
            `;
            container.appendChild(quizItem);
        });
        
        // Expose function để HTML gọi trực tiếp (tránh lỗi binding)
        window.handleQuizClick = (btn, qIdx, optIdx) => this.checkAnswer(btn, qIdx, optIdx);
    },

    checkAnswer(btn, qIndex, optIndex) {
        const parent = document.getElementById(`q-opts-${qIndex}`);
        if (parent.classList.contains('answered')) return; // Chặn click lại

        const correctIndex = this.currentData.questions[qIndex].correct;
        parent.classList.add('answered');

        if (optIndex === correctIndex) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
            // Highlight đáp án đúng
            parent.children[correctIndex].classList.add('correct');
        }

        // Hiện giải thích với animation
        const explainEl = document.getElementById(`explain-${qIndex}`);
        explainEl.style.display = 'block';
        explainEl.style.animation = 'slideDown 0.3s ease';

        this.checkCompletion();
    },

    // PATCH_v2: Hỗ trợ đọc toàn bài (Join Array)
    toggleAudio() {
        const visualizer = document.querySelector('.audio-visualizer');
        const btnPlay = document.getElementById('btn-play');
        const status = document.getElementById('audio-status');

        if (this.isSpeaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
            btnPlay.innerText = "▶️";
            status.innerText = "Đã tạm dừng";
            visualizer.classList.remove('playing');
        } else {
            if (!this.currentData) return;

            // Nối mảng thành văn bản hội thoại
            const fullText = this.currentData.dialogue.map(l => `${l.speaker === 'A' ? 'Man' : 'Woman'}: ${l.text}`).join('. ');
            
            this.speakText(fullText, () => {
                this.isSpeaking = false;
                btnPlay.innerText = "▶️";
                status.innerText = "Hoàn thành bài nghe.";
                visualizer.classList.remove('playing');
            });

            this.isSpeaking = true;
            btnPlay.innerText = "⏸️";
            status.innerText = "Đang phát toàn bài...";
            visualizer.classList.add('playing');
        }
    },

    // [NEW] Đọc 1 câu cụ thể
    playSentence(index) {
        window.speechSynthesis.cancel(); // Dừng bài đang đọc
        const line = this.currentData.dialogue[index];
        if(!line) return;

        // Highlight UI
        document.querySelectorAll('.chat-row').forEach(r => r.classList.remove('active-line'));
        document.querySelectorAll('.chat-row')[index].classList.add('active-line');

        this.speakText(line.text, () => {
             document.querySelectorAll('.chat-row')[index].classList.remove('active-line');
        });
    },

    // Helper wrapper cho SpeechSynthesis
    speakText(text, onEndCallback) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        
        const speedEl = document.querySelector('.speed-opt.active');
        utterance.rate = speedEl ? parseFloat(speedEl.dataset.val) : 1.0;

        utterance.onend = onEndCallback;
        window.speechSynthesis.speak(utterance);
    },


    checkCompletion() {
        const totalQ = this.currentData.questions.length;
        const answeredQ = document.querySelectorAll('.quiz-options.answered').length;

        if (totalQ === answeredQ) {
            // Đã làm xong hết -> Lưu vào localStorage để tính streak/progress
            // Có thể gọi hàm updateStats ở HomeTab nếu muốn kết nối các tab
            alert("Chúc mừng! Bạn đã hoàn thành bài nghe. 🎉");
        }
    }
};