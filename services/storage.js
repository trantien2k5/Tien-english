/**
 * services/storage.js
 * Quản lý lưu trữ local & Logic chống trùng lặp
 */

// PATCH_v6: Cloud Sync Core
export const Storage = {
    // PATCH_DEPLOY: Dùng link thật trên Cloudflare
    API_URL: 'https://wordstock-auth.trantien.workers.dev',

    // Helper đọc (Ưu tiên Local cho nhanh)
    get(key, defaultValue = []) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    },

    // Helper ghi (Lưu Local + Đẩy lên Cloud)
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        this.syncToCloud(key, value); // Background sync
    },

    // ☁️ Logic đẩy lên Cloud
    async syncToCloud(key, value) {
        const token = localStorage.getItem('auth_token');
        if (!token) return; // Chưa đăng nhập thì thôi

        try {
            await fetch(`${this.API_URL}/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key, data: value })
            });
            console.log(`☁️ Synced [${key}] to cloud.`);
        } catch (e) {
            console.warn(`Sync failed for [${key}]:`, e);
        }
    },

    // ☁️ Logic kéo từ Cloud về (Dùng khi mới Login)
    async pullFromCloud(key) {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(`${this.API_URL}/sync/${key}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            
            if (json.data) {
                localStorage.setItem(key, JSON.stringify(json.data));
                console.log(`⬇️ Pulled [${key}] from cloud.`);
                return json.data;
            }
        } catch (e) {
            console.error(`Pull failed for [${key}]:`, e);
        }
    },

    // Hàm gọi khi vừa Đăng nhập xong để đồng bộ toàn bộ
    async syncAll() {
        console.log("🔄 Syncing all data...");
        await this.pullFromCloud('vocab_list');
        await this.pullFromCloud('listening_history');
        await this.pullFromCloud('wordstock_settings_v1');
        await this.pullFromCloud('user_stats'); // PATCH_v7: Sync thêm Stats
        
        console.log("✅ Sync complete!");
        location.reload();
    },

    /**
     * ✅ LOGIC ANTI-TRÙNG LẶP CHO TỪ VỰNG
     * Trả về: { status: 'new' | 'updated', word: object }
     */
    addVocab(newWord) {
        const list = this.get('vocab_list');
        
        // 1. Tạo Normalized Key (chữ thường, bỏ khoảng trắng thừa)
        const key = newWord.word.trim().toLowerCase();

        // 2. Kiểm tra tồn tại
        const existingIndex = list.findIndex(w => w.word.trim().toLowerCase() === key);

        if (existingIndex > -1) {
            // A. Đã có -> Cập nhật seenCount & ngày xem gần nhất
            const existing = list[existingIndex];
            existing.seenCount = (existing.seenCount || 1) + 1;
            existing.lastSeen = Date.now();
            
            // Lưu lại
            list[existingIndex] = existing;
            this.set('vocab_list', list);
            
            return { status: 'updated', word: existing };
        } else {
            // B. Chưa có -> Thêm mới
            newWord.seenCount = 1;
            newWord.createdAt = Date.now();
            newWord.status = 'new'; // Mặc định cho SRS
            newWord.interval = 0;
            
            list.push(newWord);
            this.set('vocab_list', list);
            
            return { status: 'new', word: newWord };
        }
    },

    /**
     * ✅ LƯU LỊCH SỬ BÀI NGHE (Đã nâng cấp Anti-Duplicate)
     */
    addListeningHistory(lessonData) {
        const history = this.get('listening_history');
        const key = lessonData.topic.trim().toLowerCase(); // Normalized Key

        const existingIndex = history.findIndex(l => l.topic.trim().toLowerCase() === key);
        
        if (existingIndex > -1) {
            // BEHAVIOR CHANGE: Nếu trùng Topic -> Chỉ update seenCount & move lên đầu
            const existing = history[existingIndex];
            existing.seenCount = (existing.seenCount || 1) + 1;
            existing.lastSeen = Date.now();
            
            history.splice(existingIndex, 1);
            history.unshift(existing); // Đưa lên đầu
            this.set('listening_history', history);
            return { status: 'updated', lesson: existing };
        }

        // Tạo mới hoàn toàn
        lessonData.id = Date.now();
        lessonData.seenCount = 1;
        lessonData.completed = false;
        
        history.unshift(lessonData);
        if (history.length > 50) history.pop();
        
        this.set('listening_history', history);
        return { status: 'new', lesson: lessonData };
    },

    // Lấy thống kê nhanh cho Home
    getStats() {
        const vocab = this.get('vocab_list');
        return {
            vocabCount: vocab.length,
            masteredCount: vocab.filter(w => w.status === 'mastered').length,
            streak: parseInt(localStorage.getItem('user_streak') || 0)
        };
    },

    /**
     * ✅ QUẢN LÝ SETTINGS TẬP TRUNG (Namespace + Version)
     * Key lưu trữ: 'wordstock_settings_v1'
     */
    SETTINGS_KEY: 'wordstock_settings_v1',

    getSettings() {
        const defaultSettings = {
            // 1. Profile & Goal
            apiKey: '',
            username: 'Student',
            level: 'A1',
            goalTarget: 'communication', // communication, ielts, work...
            dailyGoal: 15, // phút
            reminderTime: '', // "20:00"

            // 2. Vocab Plan
            vocabLimitNew: 5,
            vocabLimitReview: 10,
            vocabMode: 'balanced', // light, balanced, intense

            // 3. Learning Settings
            autoPlayNext: true,
            autoReplayWrong: true,
            showScriptAfter: true,
            soundEffects: true,
            darkMode: false,

            // 4. System
            aiMode: 'speed', // speed, quality, exam
            accent: 'us', // us, uk
            theme: 'light'
        };
        const raw = localStorage.getItem(this.SETTINGS_KEY);
        if (!raw) return defaultSettings;
        
        // Merge với default để tránh lỗi khi upgrade version mới thêm trường mới
        return { ...defaultSettings, ...JSON.parse(raw) };
    },

    saveSettings(newSettings) {
        // Lấy setting cũ để merge (tránh ghi đè mất dữ liệu khác)
        const current = this.getSettings();
        const final = { ...current, ...newSettings, updatedAt: Date.now() };
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(final));
    },
    
    // Hàm tiện ích lấy nhanh API Key cho các service khác
    getApiKey() {
        const settings = this.getSettings();
        return settings.apiKey || '';
    },


    /**
     * ✅ AI HISTORY STORAGE
     * Lưu trữ tập trung mọi dữ liệu AI tạo ra
     */
    HISTORY_KEY: 'wordstock_ai_history',

    getHistory(filterType = 'all', searchQuery = '') {
        const raw = localStorage.getItem(this.HISTORY_KEY);
        let list = raw ? JSON.parse(raw) : [];

        // 1. Filter theo loại
        if (filterType !== 'all') {
            list = list.filter(item => item.type === filterType);
        }

        // 2. Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item => 
                item.title.toLowerCase().includes(q) || 
                (item.snippet && item.snippet.toLowerCase().includes(q))
            );
        }

        // Sắp xếp mới nhất trước
        return list.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * Thêm item vào lịch sử (Có chống trùng lặp)
     * @param {string} type - 'vocab' | 'listening' | 'speaking' | 'tip'
     * @param {string} title - Tiêu đề hiển thị
     * @param {object} content - Dữ liệu chi tiết (full json)
     * @param {string} snippet - Đoạn text ngắn để preview
     */
    addToHistory(type, title, content, snippet = '') {
        const list = this.getHistory();
        
        // Tạo Normalized Key để check trùng
        // Vd: vocab_apple, listening_thoi-quen
        const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, '-');
        const key = `${type}_${normalize(title)}`;

        const existingIndex = list.findIndex(i => i.key === key);

        const newItem = {
            id: Date.now().toString(),
            key: key,
            type: type,
            title: title,
            content: content,
            snippet: snippet,
            createdAt: Date.now(),
            version: 1
        };

        if (existingIndex > -1) {
            // Nếu đã có -> Update lại nội dung mới nhất & đưa lên đầu
            list.splice(existingIndex, 1);
            list.unshift(newItem);
        } else {
            // Chưa có -> Thêm mới
            list.unshift(newItem);
        }

        // Giới hạn lưu trữ (ví dụ 200 items gần nhất để nhẹ app)
        if (list.length > 200) list.pop();

        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(list));
    },

    // PATCH_v2
    deleteHistoryItem(id) {
        let list = this.getHistory();
        list = list.filter(item => item.id !== id);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(list));
    },

    /**
     * ✅ SRS ALGORITHM (Simplified SM-2)
     * Tính toán ngày ôn tiếp theo dựa trên rating
     */
    getDueWords() {
        const list = this.get('vocab_list');
        const now = Date.now();
        // Lấy các từ có dueDate <= hiện tại HOẶC từ mới (status = new)
        return list.filter(w => !w.dueDate || w.dueDate <= now || w.status === 'new');
    },

    updateVocabSRS(wordText, rating) {
        // rating: 'remember' (Good) | 'forget' (Again)
        const list = this.get('vocab_list');
        const index = list.findIndex(w => w.word === wordText);
        
        if (index > -1) {
            const word = list[index];
            const ONE_DAY = 24 * 60 * 60 * 1000;

            if (rating === 'forget') {
                // Quên -> Reset về 0, ôn lại ngay ngày mai
                word.interval = 0;
                word.status = 'learning';
                word.dueDate = Date.now() + ONE_DAY;
            } else {
                // Nhớ -> Tăng khoảng cách ôn (Exponential)
                if (word.interval === 0) word.interval = 1;
                else if (word.interval === 1) word.interval = 3;
                else word.interval = Math.ceil(word.interval * 2.2); // Hệ số 2.2
                
                word.status = word.interval > 20 ? 'mastered' : 'review';
                word.dueDate = Date.now() + (word.interval * ONE_DAY);
            }
            
            word.lastSeen = Date.now();
            list[index] = word;
            this.set('vocab_list', list);
        }
    },

    // PATCH_v7: Quản lý Stats & Streak (Cloud Sync)
    getGameStats() {
        const defaultStats = {
            exp: 0,
            streak: 0,
            lastLogin: '',
            level: 'A1',
            dailyMinutes: 0,
            dailyTasks: { vocab: false, listening: false, speaking: false },
            dailyPlanDate: ''
        };
        return this.get('user_stats', defaultStats);
    },

    saveGameStats(newStats) {
        const current = this.getGameStats();
        // Merge dữ liệu cũ và mới
        const final = { ...current, ...newStats };
        this.set('user_stats', final);
    }

};