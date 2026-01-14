import { askAI } from '../../services/ai.js';
import { Storage } from '../../services/storage.js'; // IMPORT MỚI
export default {
    currentData: null, // Lưu dữ liệu bài học hiện tại
    isSpeaking: false,

    init() {
        this.bindEvents();
        // Kiểm tra nếu có bài đang học dở (Optional: có thể thêm logic load từ localStorage)
    },

    bindEvents() {
        // 1. Nút Tạo bài
        document.getElementById('btn-gen-listen').addEventListener('click', () => this.generateLesson());

        // 2. Nút Play Audio
        document.getElementById('btn-play').addEventListener('click', () => this.toggleAudio());

        // 3. Ẩn/Hiện transcript
        document.getElementById('btn-toggle-script').addEventListener('click', (e) => {
            const scriptBox = document.getElementById('script-content');
            const isHidden = scriptBox.style.display === 'none';
            scriptBox.style.display = isHidden ? 'block' : 'none';
            e.target.innerText = isHidden ? '🙈 Ẩn văn bản' : '👁️ Xem văn bản hội thoại';
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
            // --- PROMPT KỸ THUẬT ---
            // Yêu cầu trả về JSON thuần túy để JS dễ xử lý
            const prompt = `
                Create an English listening lesson about "${topic}" (Level A2).
                1. A short dialogue (2 people, 8-12 lines).
                2. 3 multiple-choice comprehension questions.
                
                Return ONLY valid JSON format like this (no markdown, no extra text):
                {
                    "dialogue": "Person A: Hi...\\nPerson B: Hello...",
                    "questions": [
                        {
                            "q": "Question text?",
                            "options": ["A. Answer 1", "B. Answer 2", "C. Answer 3"],
                            "correct": 0,
                            "explain": "Explanation why..."
                        }
                    ]
                }
            `;

            const rawResponse = await askAI(prompt, "You are an English teacher JSON API.");

            // Parse JSON từ AI (xử lý trường hợp AI trả về markdown code block)
            const jsonStr = rawResponse.replace(/```json|```/g, '').trim();
            this.currentData = JSON.parse(jsonStr);

            this.currentData.topic = document.getElementById('listen-topic').value;
            this.currentData.createdAt = new Date().toLocaleDateString();

            // Lưu vào Storage
            Storage.addListeningHistory(this.currentData);

            this.renderLesson();
            loader.style.display = 'none';
            listenArea.style.display = 'block';
            quizArea.style.display = 'block';

        } catch (err) {
            console.error(err);
            loader.innerHTML = `<p class="text-danger">Lỗi: ${err.message}. Hãy thử lại!</p>`;
        }

        // Sau khi Storage.addListeningHistory(this.currentData);
        Storage.addToHistory(
            'listening',
            this.currentData.topic,
            this.currentData,
            `Dialogue: ${this.currentData.dialogue.substring(0, 50)}...`
        );


    },

    renderLesson() {
        // 1. Render Audio Script
        document.getElementById('script-content').innerText = this.currentData.dialogue;

        // 2. Render Quiz
        const container = document.getElementById('questions-container');
        container.innerHTML = ''; // Xóa cũ

        this.currentData.questions.forEach((q, index) => {
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item';

            // Tạo HTML cho options
            const optionsHtml = q.options.map((opt, optIndex) => `
                <div class="option-btn" data-q="${index}" data-opt="${optIndex}">
                    ${opt}
                </div>
            `).join('');

            quizItem.innerHTML = `
                <div class="quiz-question">${index + 1}. ${q.q}</div>
                <div class="quiz-options">${optionsHtml}</div>
                <div class="quiz-explain" id="explain-${index}">
                    💡 <strong>Giải thích:</strong> ${q.explain}
                </div>
            `;
            container.appendChild(quizItem);
        });

        // Gắn sự kiện click cho các đáp án
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.checkAnswer(e.target));
        });
    },

    toggleAudio() {
        if (this.isSpeaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
            document.getElementById('btn-play').innerText = "▶️";
            document.getElementById('audio-status').innerText = "Đã tạm dừng";
        } else {
            if (!this.currentData) return;

            const utterance = new SpeechSynthesisUtterance(this.currentData.dialogue);
            utterance.lang = 'en-US';

            // Lấy tốc độ từ radio button
            const speed = document.querySelector('input[name="speed"]:checked').value;
            utterance.rate = parseFloat(speed);

            utterance.onend = () => {
                this.isSpeaking = false;
                document.getElementById('btn-play').innerText = "▶️";
                document.getElementById('audio-status').innerText = "Đã đọc xong. Hãy làm bài tập bên dưới!";
            };

            window.speechSynthesis.speak(utterance);
            this.isSpeaking = true;
            document.getElementById('btn-play').innerText = "⏸️"; // Nút Pause
            document.getElementById('audio-status').innerText = "Đang đọc...";
        }
    },

    checkAnswer(btn) {
        // Nếu đã chọn rồi thì không cho chọn lại trong cùng 1 câu
        const parent = btn.parentElement;
        if (parent.classList.contains('answered')) return;

        const qIndex = parseInt(btn.dataset.q);
        const optIndex = parseInt(btn.dataset.opt);
        const correctIndex = this.currentData.questions[qIndex].correct;

        // Đánh dấu đã trả lời
        parent.classList.add('answered');

        if (optIndex === correctIndex) {
            btn.classList.add('correct');
            // Sound effect nhỏ (optional)
        } else {
            btn.classList.add('wrong');
            // Highlight câu đúng
            parent.children[correctIndex].classList.add('correct');
        }

        // Hiện giải thích
        document.getElementById(`explain-${qIndex}`).style.display = 'block';

        // Kiểm tra xem đã làm hết chưa -> Lưu tiến độ
        this.checkCompletion();
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