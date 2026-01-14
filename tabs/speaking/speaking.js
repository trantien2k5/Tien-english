import { askAI } from '../../services/ai.js';
import { Storage } from '../../services/storage.js';

export default {
    recognition: null,

    // [NEW] Danh sách chủ đề
    topics: [
        "Describe your favorite food 🍕",
        "Talk about your daily routine 📅",
        "What is your dream job? 💼",
        "Introduce yourself in 3 sentences 👋",
        "Why do you learn English? 🇬🇧",
        "Describe your best friend 👫",
        "Talk about a memorable trip ✈️"
    ],

    init() {
        this.setupRecognition();
        this.bindEvents();

        // [NEW] Gán sự kiện nút đổi chủ đề ngay khi init
        const btnTopic = document.getElementById('btn-change-topic');
        if (btnTopic) {
            btnTopic.addEventListener('click', () => this.randomTopic());
        }
        this.randomTopic(); // Load 1 topic mặc định
    },

    randomTopic() {
        const t = this.topics[Math.floor(Math.random() * this.topics.length)];
        const el = document.getElementById('current-topic');
        if (el) {
            // Hiệu ứng fade nhẹ
            el.style.opacity = 0;
            setTimeout(() => {
                el.innerText = t;
                el.style.opacity = 1;
            }, 200);
        }
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
        const mic = document.getElementById('mic-pulse');
        const wave = document.getElementById('wave-animation');
        const btn = document.getElementById('btn-record');
        
        if (mic) mic.classList.remove('pulsing');
        if (wave) wave.style.display = 'none';
        if (btn) btn.style.backgroundColor = '';
    },

    async handleSpeakingResult(userText) {
        const recordArea = document.getElementById('record-area');
        const resultArea = document.getElementById('result-area');
        const transEl = document.getElementById('user-transcript-html');
        const commentEl = document.getElementById('score-comment');

        if (recordArea) recordArea.style.display = 'none';
        if (resultArea) resultArea.style.display = 'block';
        if (transEl) transEl.innerHTML = `"${userText}"`;
        if (commentEl) commentEl.innerHTML = '<div class="loader"></div> Đang chấm điểm...';

        try {
            const prompt = `
                Evaluate this spoken English sentence: "${userText}".
                Return ONLY valid JSON:
                {
                    "score": number (1-10),
                    "comment": "Short comment",
                    "highlighted_html": "Original text with <span class='highlight-error'>errors</span>",
                    "corrected": "Correct version",
                    "errors": [{"wrong": "...", "right": "...", "explain": "..."}],
                    "better_versions": ["Native phrase 1", "Native phrase 2"]
                }
            `;

            const raw = await askAI(prompt, "You are a JSON English Coach.");
            const data = JSON.parse(raw.replace(/```json|```/g, '').trim());

            this.renderResult(data);
            this.updateProgress(data.score);

        } catch (err) {
            console.error(err);
            if (commentEl) commentEl.innerText = "Lỗi: " + err.message;
        }
    },

// [NEW] Logic cộng điểm EXP & Streak
updateProgress(score) {
    // 1. Cộng EXP (Giả lập)
    // Lưu ý: Cần kết nối Home logic sau này
    let currentExp = parseInt(localStorage.getItem('user_exp') || '0');
    const bonus = score >= 8 ? 15 : 10;
    localStorage.setItem('user_exp', currentExp + bonus);

    // 2. Update Streak (Nếu chưa tính hôm nay)
    const today = new Date().toDateString();
    const lastStreak = localStorage.getItem('last_streak_date');
    if (lastStreak !== today) {
        let streak = parseInt(localStorage.getItem('user_streak') || '0');
        localStorage.setItem('user_streak', streak + 1);
        localStorage.setItem('last_streak_date', today);
    }

    console.log(`🎁 +${bonus} EXP! Streak updated.`);
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

    // Lưu kết quả chấm điểm
    Storage.addToHistory(
        'speaking',
        `Practice: Score ${data.score}/10`,
        data,
        `User: "${userText}" -> AI: ${data.comment}`
    );
},



resetUI() {
    document.getElementById('record-area').style.display = 'block';
    document.getElementById('result-area').style.display = 'none';
    document.getElementById('status-text').innerText = "Nhấn để bắt đầu nói...";
}   
};