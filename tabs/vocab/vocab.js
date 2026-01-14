// Thay đổi import
import { askAI } from '../../services/ai.js'; // Kiểm tra đường dẫn ai.js của bạn
import { Storage } from '../../services/storage.js'; // IMPORT MỚI

export default {
    // Biến lưu trữ tạm thời
    vocabList: [],
    reviewSession: [],
    currentCardIndex: 0,
    tempWordData: null, // Lưu kết quả tra từ trước khi bấm Save

    init() {
        this.loadData();
        this.renderDashboard();
        this.bindEvents();
    },

    loadData() {
        // Lấy dữ liệu từ localStorage
        const raw = localStorage.getItem('vocab_list');
        this.vocabList = raw ? JSON.parse(raw) : [];

        // Kiểm tra xem có từ nào cần ôn hôm nay không
        const today = new Date().setHours(0, 0, 0, 0);
        this.reviewSession = this.vocabList.filter(word => {
            return word.dueDate <= today || word.status === 'new';
        });
    },


    bindEvents() {
        // 1. Sự kiện Tra từ
        const btnLookup = document.getElementById('btn-lookup');
        btnLookup.addEventListener('click', () => this.handleLookup());

        // 2. Sự kiện Lưu từ
        document.getElementById('btn-save-word').addEventListener('click', () => this.saveNewWord());

        // 3. Sự kiện Bắt đầu ôn tập
        document.getElementById('btn-start-review').addEventListener('click', () => this.startReview());

        // 4. Sự kiện Lật thẻ (Hiện đáp án)
        document.getElementById('btn-show-answer').addEventListener('click', () => {
            document.getElementById('card-back').style.display = 'block';
            document.getElementById('btn-show-answer').style.display = 'none';
            document.getElementById('rating-btns').style.display = 'flex';
        });

        // 5. Sự kiện Đánh giá (Again/Hard/Good/Easy)
        document.querySelectorAll('.btn-rate').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rating = e.currentTarget.dataset.rate;
                this.processCard(rating);
            });
        });
    },

    // --- LOGIC SRS (SPACED REPETITION) ---
    processCard(rating) {
        const word = this.reviewSession[this.currentCardIndex];
        const now = new Date();

        // Thuật toán SM-2 giản lược
        if (rating === 'again') {
            word.interval = 0; // Reset về 0 ngày
            word.status = 'learning';
            word.dueDate = now.setHours(0, 0, 0, 0); // Ôn lại ngay hôm nay (hoặc cuối phiên)
        } else {
            // Tính toán Interval mới
            let multiplier = 1;
            if (rating === 'hard') multiplier = 1.2;
            if (rating === 'good') multiplier = 2.5;
            if (rating === 'easy') multiplier = 4.0;

            // Nếu từ mới, interval khởi tạo = 1 ngày
            if (word.interval === 0) word.interval = 1;
            else word.interval = Math.ceil(word.interval * multiplier);

            // Cập nhật ngày ôn tiếp theo
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + word.interval);
            word.dueDate = nextDate.getTime();

            // Cập nhật trạng thái hiển thị
            if (word.interval > 21) word.status = 'mastered';
            else if (word.interval > 3) word.status = 'review';
            else word.status = 'learning';
        }

        // Lưu lại vào danh sách chính
        this.saveToStorage();

        // Chuyển sang thẻ tiếp theo
        this.currentCardIndex++;
        if (this.currentCardIndex < this.reviewSession.length) {
            this.showCard(this.currentCardIndex);
        } else {
            this.finishReview();
        }
    },

    startReview() {
        if (this.reviewSession.length === 0) {
            alert("Bạn đã hoàn thành bài ôn hôm nay! 🎉");
            return;
        }
        document.getElementById('dashboard-card').style.display = 'none';
        document.getElementById('add-word-ui').style.display = 'none';
        document.getElementById('review-ui').style.display = 'flex';

        this.currentCardIndex = 0;
        this.showCard(0);
    },

    showCard(index) {
        const word = this.reviewSession[index];
        const cardUI = document.getElementById('review-ui');

        // Reset UI
        cardUI.classList.remove('card-anim');
        void cardUI.offsetWidth; // Trigger reflow
        cardUI.classList.add('card-anim');

        document.getElementById('card-status').innerText = word.status.toUpperCase();
        document.getElementById('card-status').className = `tag-status ${word.status}`; // thêm class màu
        document.getElementById('card-front').innerText = word.word;
        document.getElementById('card-ipa').innerText = word.ipa;

        // Ẩn mặt sau
        document.getElementById('card-meaning').innerText = word.meaning;
        document.getElementById('card-example').innerHTML = word.example;
        document.getElementById('card-back').style.display = 'none';
        document.getElementById('btn-show-answer').style.display = 'block';
        document.getElementById('rating-btns').style.display = 'none';
    },

    // PATCH_v2: Sync with Home Tab
    finishReview() {
        // Cập nhật Daily Plan
        const tasks = JSON.parse(localStorage.getItem('daily_tasks')) || {};
        tasks.vocab = true;
        localStorage.setItem('daily_tasks', JSON.stringify(tasks));

        alert("Chúc mừng! Bạn đã hoàn thành phiên ôn tập hôm nay. 🔥");
        location.reload(); 
    },



    async handleLookup() {
        const input = document.getElementById('vocab-input');
        const userQuery = input.value.trim();
        if (!userQuery) return;

        // 1. UI Loading (Feedback mục C)
        const resultUI = document.getElementById('vocab-result');
        resultUI.style.display = 'block';
        // Skeleton loading đơn giản
        document.getElementById('v-definition').innerHTML = `
        <div style="opacity: 0.6">
            <p>🤖 AI đang phân tích ngữ nghĩa...</p>
            <div class="loader"></div>
        </div>
    `;
        // Reset nút lưu
        const btnSave = document.getElementById('btn-save-word');
        btnSave.innerText = "💾 Thêm vào SRS";
        btnSave.disabled = true; // Chặn bấm khi đang load
        btnSave.classList.remove('btn--outline');
        btnSave.classList.add('btn--primary');

        try {
            // 2. PROMPT THÔNG MINH (Feedback mục D - Giải quyết vấn đề Tra Việt ra Anh)
            const prompt = `
            Analyze this input: "${userQuery}".
            Role: English Dictionary & Teacher.
            Logic:
            1. If input is Vietnamese (e.g., "trái cây"), translate to English ("Fruit") then define.
            2. If input is English, define it directly.
            
            Return ONLY JSON format:
            {
                "word": "The English word (Capitalized)",
                "ipa": "/IPA transcription/",
                "type": "noun/verb/adj",
                "meaning": "Short Vietnamese meaning",
                "example_en": "Example sentence in English",
                "example_vi": "Translation of example in Vietnamese",
                "synonyms": "word1, word2"
            }
        `;

            const jsonStr = await askAI(prompt, "You are a JSON Dictionary API.");

            // Parse JSON (có xử lý lỗi nếu AI trả về markdown)
            const cleanJson = jsonStr.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            // 3. Render Kết quả "Chuẩn học thuật" (Feedback mục D - 4, 5)
            document.getElementById('v-word').innerText = data.word; // Luôn là tiếng Anh
            document.getElementById('v-ipa').innerText = `${data.type} • ${data.ipa}`; // Thêm từ loại

            document.getElementById('v-definition').innerHTML = `
            <div style="margin-top: 10px">
                <p style="font-size: 1.1rem; font-weight: 500; color: var(--color-text-main)">
                    👉 ${data.meaning}
                </p>
                <div style="margin-top: 12px; padding: 10px; background: #f8fafc; border-radius: 8px; border-left: 3px solid var(--color-primary)">
                    <p style="color: #475569; font-style: italic">"${data.example_en}"</p>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 4px">(${data.example_vi})</p>
                </div>
                ${data.synonyms ? `<p style="margin-top:8px; font-size:0.85rem; color:#64748b">Synonyms: ${data.synonyms}</p>` : ''}
            </div>
        `;

            // Chuẩn bị dữ liệu để lưu
            this.tempWordData = {
                word: data.word, // Lưu từ tiếng Anh
                meaning: data.meaning,
                ipa: data.ipa,
                example: `<p>${data.example_en}</p><small>${data.example_vi}</small>`, // Lưu cả song ngữ
                status: 'new',
                dueDate: new Date().getTime(),
                interval: 0,
                seenCount: 0
            };

            // Kích hoạt nút lưu
            btnSave.disabled = false;

            // 4. Check trùng ngay lập tức (Feedback mục 4)
            // Gọi Storage để check xem từ này có chưa để update UI nút
            const list = JSON.parse(localStorage.getItem('vocab_list') || '[]');
            const exists = list.some(w => w.word.toLowerCase() === data.word.toLowerCase());
            if (exists) {
                btnSave.innerText = "✅ Đã có trong kho";
                btnSave.classList.add('btn--outline');
                btnSave.classList.remove('btn--primary');
            }

        } catch (err) {
            console.error(err);
            document.getElementById('v-definition').innerText = "Lỗi AI: " + err.message;
            btnSave.disabled = true;
        }
    },

    saveNewWord() {
    if (!this.tempWordData) return;

    // Sử dụng logic Storage đã có (Normalized Key đã được xử lý trong storage.js rồi)
    //
    const result = Storage.addVocab(this.tempWordData);

    const btnSave = document.getElementById('btn-save-word');

    if (result.status === 'updated') {
        // Feedback người dùng khi trùng
        alert(`Từ "${result.word.word}" đã được cập nhật lại vào lộ trình ôn tập! 🔄`);
    } else {
        // Feedback thành công
        alert("Đã thêm vào SRS thành công! 🌱");
        
        // Cập nhật UI nút ngay lập tức để tránh spam click
        btnSave.innerText = "✅ Đã lưu";
        btnSave.disabled = true;
        btnSave.classList.remove('btn--primary');
        btnSave.classList.add('btn--outline');
    }

    // Reload Dashboard
    this.loadData();
    this.renderDashboard();
    
    // Clear input để nhập từ tiếp theo dễ hơn
    document.getElementById('vocab-input').value = '';
    document.getElementById('vocab-input').focus();
},

    saveToStorage() {
        localStorage.setItem('vocab_list', JSON.stringify(this.vocabList));
    },

    renderDashboard() {
        // Đếm số lượng
        const counts = { new: 0, learning: 0, mastered: 0 };
        this.vocabList.forEach(w => {
            if (counts[w.status] !== undefined) counts[w.status]++;
            else counts.learning++; // Review coi như learning
        });

        document.getElementById('count-new').innerText = counts.new;
        document.getElementById('count-learning').innerText = counts.learning;
        document.getElementById('count-mastered').innerText = counts.mastered;
        document.getElementById('review-count').innerText = this.reviewSession.length;

        // Disable nút Review nếu không có bài
        const btnReview = document.getElementById('btn-start-review');
        if (this.reviewSession.length === 0) {
            btnReview.classList.add('btn--outline');
            btnReview.classList.remove('btn--primary');
            btnReview.innerText = "Đã hoàn thành";
            btnReview.disabled = true;
        }
    }
};