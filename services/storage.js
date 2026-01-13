/**
 * services/storage.js
 * Quản lý lưu trữ local & Logic chống trùng lặp
 */

export const Storage = {
    // Helper đọc/ghi nhanh
    get(key, defaultValue = []) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
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
     * ✅ LƯU LỊCH SỬ BÀI NGHE
     * Giúp user xem lại bài cũ, tránh tạo lại bài trùng chủ đề ngay lập tức
     */
    addListeningHistory(lessonData) {
        const history = this.get('listening_history');
        
        // Thêm timestamp ID
        lessonData.id = Date.now();
        lessonData.completed = false; // Trạng thái làm bài

        // Thêm vào đầu danh sách
        history.unshift(lessonData);
        
        // Giới hạn lưu 50 bài gần nhất để nhẹ máy
        if (history.length > 50) history.pop();

        this.set('listening_history', history);
    },

    // Lấy thống kê nhanh cho Home
    getStats() {
        const vocab = this.get('vocab_list');
        return {
            vocabCount: vocab.length,
            masteredCount: vocab.filter(w => w.status === 'mastered').length,
            streak: parseInt(localStorage.getItem('user_streak') || 0)
        };
    }
};