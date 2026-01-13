import { askAI } from '../../services/ai.js';

export default {
    recognition: null,

    init() {
        this.setupRecognition();
        this.bindEvents();
    },

    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome!");
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
    },

    bindEvents() {
        const btnRecord = document.getElementById('btn-record');
        const btnRetry = document.getElementById('btn-retry');

        btnRecord.addEventListener('click', () => this.startRecording());
        btnRetry.addEventListener('click', () => this.resetUI());

        // Xử lý kết quả trả về từ micro
        this.recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            this.handleSpeakingResult(text);
        };

        this.recognition.onerror = (event) => {
            document.getElementById('status-text').innerText = "Lỗi: " + event.error;
            this.stopAnimation();
        };

        this.recognition.onend = () => {
            this.stopAnimation();
        };
    },

    startRecording() {
        try {
            this.recognition.start();
            document.getElementById('status-text').innerText = "Đang nghe...";
            document.getElementById('mic-pulse').classList.add('pulsing');
            document.getElementById('wave-animation').style.display = 'flex';
            document.getElementById('btn-record').style.backgroundColor = 'var(--color-danger)';
        } catch (e) {
            console.error(e);
        }
    },

    stopAnimation() {
        document.getElementById('mic-pulse').classList.remove('pulsing');
        document.getElementById('wave-animation').style.display = 'none';
        document.getElementById('btn-record').style.backgroundColor = '';
    },

    async handleSpeakingResult(userText) {
        // Chuyển sang màn hình loading kết quả
        document.getElementById('record-area').style.display = 'none';
        document.getElementById('result-area').style.display = 'block';
        
        // Hiển thị tạm thời
        document.getElementById('user-transcript-html').innerHTML = `"${userText}"`;
        document.getElementById('score-comment').innerHTML = '<div class="loader"></div> Đang chấm điểm...';

        try {
            // PROMPT KỸ THUẬT: Yêu cầu JSON chi tiết
            const prompt = `
                Act as an strict English Speaking Coach. Evaluate this sentence: "${userText}".
                Return ONLY a JSON object with this format:
                {
                    "score": number (1-10),
                    "comment": "Short encouraging comment",
                    "highlighted_html": "Original text but wrap errors in <span class='highlight-error'>wrong_word</span>",
                    "corrected": "Grammatically correct version",
                    "errors": [
                        {"wrong": "...", "right": "...", "explain": "Short reason"}
                    ],
                    "better_versions": ["Native way 1", "Native way 2"]
                }
            `;

            const rawResponse = await askAI(prompt, "You are a JSON API.");
            const jsonStr = rawResponse.replace(/```json|```/g, '').trim();
            const data = JSON.parse(jsonStr);

            this.renderResult(data);

        } catch (err) {
            console.error(err);
            document.getElementById('score-comment').innerText = "Lỗi AI: " + err.message;
        }
    },

    renderResult(data) {
        // 1. Điểm số (Màu sắc theo điểm)
        const scoreEl = document.getElementById('score-number');
        scoreEl.innerText = data.score;
        const circle = document.querySelector('.score-circle');
        
        if (data.score >= 8) circle.style.borderColor = 'var(--color-success)';
        else if (data.score >= 5) circle.style.borderColor = 'var(--color-warning)';
        else circle.style.borderColor = 'var(--color-danger)';

        document.getElementById('score-title').innerText = data.score >= 8 ? "Excellent! 🎉" : (data.score >= 5 ? "Good job! 👍" : "Needs Practice 💪");
        document.getElementById('score-comment').innerText = data.comment;

        // 2. Transcript Highlight & Correction
        document.getElementById('user-transcript-html').innerHTML = data.highlighted_html;
        document.getElementById('corrected-text').innerText = data.corrected;

        // 3. List lỗi chi tiết
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = '';
        if (data.errors.length === 0) {
            errorList.innerHTML = '<p style="color:var(--color-success)">Không tìm thấy lỗi sai nào. Tuyệt vời!</p>';
        } else {
            data.errors.forEach(err => {
                errorList.innerHTML += `
                    <div class="error-item">
                        <span class="tag-wrong">${err.wrong}</span> ➔ 
                        <span class="tag-right">${err.right}</span>: 
                        <span>${err.explain}</span>
                    </div>
                `;
            });
        }

        // 4. Native Suggestions
        const suggestList = document.getElementById('suggestion-list');
        suggestList.innerHTML = data.better_versions.map(s => `<li>${s}</li>`).join('');
    },

    resetUI() {
        document.getElementById('record-area').style.display = 'block';
        document.getElementById('result-area').style.display = 'none';
        document.getElementById('status-text').innerText = "Nhấn để bắt đầu nói...";
    }
};