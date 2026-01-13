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
        const today = new Date().setHours(0,0,0,0);
        this.reviewSession = this.vocabList.filter(word => {
            return word.dueDate <= today || word.status === 'new';
        });
    },

    saveNewWord() {
        if (!this.tempWordData) return;

        // --- DÙNG LOGIC MỚI TỪ STORAGE ---
        const result = Storage.addVocab(this.tempWordData);

        if (result.status === 'updated') {
            alert(`Từ "${result.word.word}" đã có trong kho! \n(Đã tăng số lần gặp lên: ${result.word.seenCount})`);
        } else {
            alert("Đã lưu từ mới thành công! 🎉");
        }

        // Reset UI
        document.getElementById('vocab-input').value = '';
        document.getElementById('vocab-result').style.display = 'none';
        
        // Reload dữ liệu để cập nhật Dashboard
        this.loadData(); 
        this.renderDashboard();
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
            word.dueDate = now.setHours(0,0,0,0); // Ôn lại ngay hôm nay (hoặc cuối phiên)
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

    finishReview() {
        alert("Chúc mừng! Bạn đã hoàn thành phiên ôn tập hôm nay. 🔥");
        location.reload(); // Tải lại trang để cập nhật Dashboard
    },

    // --- LOGIC TRA TỪ & LƯU TỪ ---
    async handleLookup() {
        const input = document.getElementById('vocab-input');
        const word = input.value.trim();
        if (!word) return;

        const resultUI = document.getElementById('vocab-result');
        resultUI.style.display = 'block';
        document.getElementById('v-definition').innerHTML = '<div class="loader"></div> Đang phân tích...';

        try {
            // Gọi AI lấy JSON cho dễ xử lý
            const prompt = `Explain "${word}" in Vietnamese. Return ONLY a JSON object: {"mean": "nghĩa tiếng việt", "ipa": "/ipa/", "ex": "English example sentence (<b>word</b> highlighted)"}.`;
            const jsonStr = await askAI(prompt, "You are a dictionary API.");
            
            // Parse JSON từ AI (đôi khi AI trả về text thừa, cần lọc)
            const cleanJson = jsonStr.substring(jsonStr.indexOf('{'), jsonStr.lastIndexOf('}') + 1);
            const data = JSON.parse(cleanJson);

            // Hiển thị
            document.getElementById('v-word').innerText = word;
            document.getElementById('v-ipa').innerText = data.ipa;
            document.getElementById('v-definition').innerHTML = `
                <p><b>Nghĩa:</b> ${data.mean}</p>
                <p><b>Ví dụ:</b> ${data.ex}</p>
            `;

            // Lưu vào biến tạm
            this.tempWordData = {
                word: word,
                meaning: data.mean,
                ipa: data.ipa,
                example: data.ex,
                // SRS Data khởi tạo
                status: 'new',
                dueDate: new Date().getTime(), // Học ngay hôm nay
                interval: 0,
                ease: 2.5
            };

        } catch (err) {
            document.getElementById('v-definition').innerText = "Lỗi: " + err.message;
        }
    },

    saveNewWord() {
        if (!this.tempWordData) return;
        
        // Check trùng
        const exists = this.vocabList.some(w => w.word.toLowerCase() === this.tempWordData.word.toLowerCase());
        if (exists) {
            alert("Từ này đã có trong kho!");
            return;
        }

        this.vocabList.push(this.tempWordData);
        this.saveToStorage();
        alert("Đã lưu từ mới! Hãy ôn tập ngay nhé.");
        
        // Reset UI
        document.getElementById('vocab-input').value = '';
        document.getElementById('vocab-result').style.display = 'none';
        this.renderDashboard(); // Cập nhật số liệu
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