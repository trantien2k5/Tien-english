import { askAI } from '../../services/ai.js';
import { Storage } from '../../services/storage.js'; // IMPORT MỚI
export default {
    currentData: null, // Lưu dữ liệu bài học hiện tại
    isSpeaking: false,

    init() {
        this.bindEvents();
        this.bindChipEvents(); // Handle Chips UI
        this.renderRecent();   // Show history
        this.updateDashboard(); // PATCH_v2
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

    // PATCH_v2
    updateDashboard() {
        const tasks = JSON.parse(localStorage.getItem('daily_tasks')) || { vocab: false, listening: false, speaking: false };
        const doneCount = [tasks.vocab, tasks.listening, tasks.speaking].filter(Boolean).length;
        
        const countEl = document.getElementById('db-count');
        if(countEl) countEl.innerText = `${doneCount}/3`;

        const steps = document.querySelectorAll('.db-step');
        if(steps.length >= 3) {
            if(tasks.vocab) steps[0].classList.add('done');
            if(tasks.listening) steps[1].classList.add('done');
            if(tasks.speaking) steps[2].classList.add('done');
        }
    },

    // PATCH_v2: Logic load lại bài học cũ
    renderRecent() {
        // Bind window function để HTML gọi được
        window.reloadLesson = (id) => this.reloadLesson(id);

        const list = Storage.getHistory('listening');
        const container = document.getElementById('recent-list');
        if(!container) return;

        if (list.length === 0) {
            container.innerHTML = '<p style="font-size:0.9rem; color:#999; text-align:center; padding:10px;">📭 Chưa có bài học nào.</p>';
            return;
        }

        container.innerHTML = list.slice(0, 3).map(item => `
            <div class="recent-item" onclick="window.reloadLesson('${item.id}')">
                <div class="recent-info">
                    <h5>${item.title}</h5>
                    <span>${new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="recent-status">⏯</div>
            </div>
        `).join('');
    },

    reloadLesson(id) {
        const item = Storage.getHistory('listening').find(x => x.id == id);
        if (!item) return alert("Không tìm thấy dữ liệu bài học!");

        this.currentData = item.content;
        
        // Ẩn Dashboard & Mode để hiện Player
        document.querySelector('.dashboard-card').style.display = 'none';
        document.querySelector('.mode-grid').style.display = 'none';
        document.getElementById('recent-area').style.display = 'none';
        document.getElementById('custom-setup-ui').style.display = 'none';

        // Hiện Player
        document.getElementById('listen-area').style.display = 'block';
        document.getElementById('quiz-area').style.display = 'block';

        this.renderLesson();
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
            // PATCH_v3: Added Dictation Challenge
            const prompt = `
                Create a listening lesson. Topic: "${topic}". Level: ${level}.
                Structure:
                1. Dialogue: 6-10 turns. Natural.
                2. 3 Quiz questions (MCQ).
                3. 3 Key phrases for SRS.
                4. 1 Dictation sentence (taken from dialogue, replace 2-3 hard words with underscores).

                Return ONLY valid JSON:
                {
                    "topic_en": "Topic Name",
                    "dialogue": [ {"speaker": "A", "text": "..."} ],
                    "questions": [ {"q": "...", "options": ["..."], "correct": 0, "explain": "..."} ],
                    "srs_vocab": [ {"word": "...", "meaning": "..."} ],
                    "dictation": {
                        "full_text": "I want to buy a coffee",
                        "masked_text": "I want to ___ a ___",
                        "answers": ["buy", "coffee"]
                    }
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
        
        // PATCH_v3: Render Dictation
        window.handleQuizClick = (btn, q, o) => this.checkAnswer(btn, q, o);
        window.checkDictation = () => this.checkDictation();
        
        if (this.currentData.dictation) this.renderDictation();
    },

    renderDictation() {
        const container = document.getElementById('questions-container');
        const d = this.currentData.dictation;
        const html = `
            <div class="quiz-item dictation-box">
                <div class="quiz-question"><span style="color:#8b5cf6">🎧 Thử thách:</span> Nghe & Điền từ còn thiếu</div>
                <div class="dictation-text">
                    "${d.masked_text.replace(/___/g, '<input type="text" class="gap-input" placeholder="...">')}"
                </div>
                <button class="btn-action btn-sm mt-3" onclick="window.checkDictation()">Kiểm tra</button>
                <div id="dictation-feedback" class="quiz-explain"></div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    },

    checkDictation() {
        const inputs = document.querySelectorAll('.gap-input');
        const answers = this.currentData.dictation.answers;
        let correct = 0;
        
        inputs.forEach((inp, i) => {
            if(inp.value.trim().toLowerCase() === answers[i].toLowerCase()) {
                inp.classList.add('correct'); correct++;
            } else {
                inp.classList.add('wrong');
            }
        });

        const fb = document.getElementById('dictation-feedback');
        fb.style.display = 'block';
        
        if(correct === answers.length) {
            fb.innerHTML = `🎉 Chính xác! <b>"${this.currentData.dictation.full_text}"</b>`;
            fb.classList.add('done-dictation');
            this.checkCompletion();
        } else {
            fb.innerHTML = `💡 Gợi ý: ${answers.join(', ')}`;
        }
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

    // PATCH_v2: Sequential Playback (No prefix text)
    toggleAudio() {
        const viz = document.querySelector('.audio-visualizer');
        const btn = document.getElementById('btn-play');
        const st = document.getElementById('audio-status');

        if (this.isSpeaking) {
            this.isSpeaking = false;
            window.speechSynthesis.cancel();
            btn.innerText = "▶️";
            if(st) st.innerText = "Đã tạm dừng";
            if(viz) viz.classList.remove('playing');
        } else {
            if (!this.currentData) return;
            this.isSpeaking = true;
            btn.innerText = "⏸️";
            if(st) st.innerText = "Đang phát...";
            if(viz) viz.classList.add('playing');
            
            // Start sequence from line 0
            this.playSentence(0, true);
        }
    },

    // PATCH_v2: Smart Play (Voice + AutoNext)
    playSentence(index, autoNext = false) {
        window.speechSynthesis.cancel();
        const line = this.currentData.dialogue[index];
        if (!line) { if(autoNext) this.toggleAudio(); return; } // Hết bài

        document.querySelectorAll('.chat-row').forEach(r => r.classList.remove('active-line'));
        const row = document.querySelectorAll('.chat-row')[index];
        if(row) { row.classList.add('active-line'); row.scrollIntoView({behavior:'smooth', block:'center'}); }

        this.speakText(line.text, () => {
            if(row) row.classList.remove('active-line');
            if (autoNext && this.isSpeaking) this.playSentence(index + 1, true);
        }, line.speaker);
    },

    speakText(text, callback, speaker) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        
        // Voice Selection Logic
        const voices = window.speechSynthesis.getVoices();
        const male = voices.find(v => v.name.includes('Male')) || voices[0];
        const female = voices.find(v => v.name.includes('Female')) || voices[1] || voices[0];
        u.voice = (speaker === 'A') ? male : female;

        const speed = document.querySelector('.speed-opt.active');
        u.rate = speed ? parseFloat(speed.dataset.val) : 1.0;
        u.onend = callback;
        window.speechSynthesis.speak(u);
    },


    // PATCH_v3: Strict Completion Check (Quiz + Dictation)
    checkCompletion() {
        // 1. Check Quiz
        const totalQ = this.currentData.questions.length;
        const answeredQ = document.querySelectorAll('.quiz-options.answered').length;
        const quizDone = totalQ === answeredQ;

        // 2. Check Dictation (Nếu có)
        let dictDone = true;
        if (this.currentData.dictation) {
            const fb = document.getElementById('dictation-feedback');
            dictDone = fb && fb.classList.contains('done-dictation');
        }

        if (quizDone && dictDone) {
            // Animation chúc mừng
            const btn = document.getElementById('btn-play');
            if(btn) btn.innerText = "🎉";
            
            // Auto Update Dashboard
            const tasks = JSON.parse(localStorage.getItem('daily_tasks')) || {};
            if(!tasks.listening) {
                tasks.listening = true;
                localStorage.setItem('daily_tasks', JSON.stringify(tasks));
                if(this.updateDashboard) this.updateDashboard(); 
            }

            setTimeout(() => alert("Tuyệt vời! Bạn đã hoàn thành bài nghe xuất sắc (100%). 🏆"), 500);
        }
    }
};