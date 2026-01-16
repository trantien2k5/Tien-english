import { Storage } from '../../services/storage.js'; // PATCH_v2: Import Storage

export default {
    init() {
        this.syncHeader(); // PATCH_v2: Cập nhật tên
        this.checkNewDay();
        this.renderDailyPlan();
        this.renderStats(); 

        window.startTask = (taskType) => this.handleTaskClick(taskType);
    },

    syncHeader() {
        const settings = Storage.getSettings();
        const title = document.querySelector('.page-header__title');
        if(title) title.innerText = `Xin chào, ${settings.username || 'Student'}! 👋`;
    },

    // --- 1. LOGIC DAILY PLAN (Cloud Synced) ---
    checkNewDay() {
        const today = new Date().toDateString();
        const stats = Storage.getGameStats();
        
        if (stats.dailyPlanDate !== today) {
            // Reset task ngày mới
            Storage.saveGameStats({
                dailyTasks: { vocab: false, listening: false, speaking: false },
                dailyMinutes: 0,
                dailyPlanDate: today
            });
        }
    },

    renderDailyPlan() {
        const stats = Storage.getGameStats();
        const tasks = stats.dailyTasks || { vocab: false, listening: false, speaking: false };
        let completedCount = 0;

        this.updateTaskUI('vocab', tasks.vocab);
        this.updateTaskUI('listen', tasks.listening);
        this.updateTaskUI('speak', tasks.speaking);

        if(tasks.vocab) completedCount++;
        if(tasks.listening) completedCount++;
        if(tasks.speaking) completedCount++;

        // Update Text & Chart
        const progressEl = document.getElementById('plan-progress');
        if(progressEl) progressEl.innerText = `${completedCount}/3`;
        
        const percent = Math.round((completedCount / 3) * 100);
        const circle = document.getElementById('circle-path');
        const percentText = document.getElementById('percent-text');
        
        if(circle) circle.setAttribute('stroke-dasharray', `${percent}, 100`);
        if(percentText) percentText.innerText = `${percent}%`;
    },

    updateTaskUI(idSuffix, isDone) {
        const el = document.getElementById(`task-${idSuffix}`);
        if (!el) return;
        
        const btn = el.querySelector('.btn-action');
        if (isDone) {
            el.classList.add('completed');
            btn.innerText = "Đã xong ✔";
            btn.onclick = null;
        } else {
            el.classList.remove('completed');
            btn.innerText = "Bắt đầu";
        }
    },

    // PATCH_v2: Chỉ điều hướng, không đánh dấu xong (Anti-Cheat)
    handleTaskClick(taskType) {
        // Chuyển tab để người dùng làm bài thật
        const navItem = document.querySelector(`.nav-item[data-target="${taskType}"]`);
        if (navItem) {
            navItem.click();
        }
        // Lưu ý: Trạng thái 'done' sẽ do các tab con tự cập nhật vào localStorage
    },

    // --- 2. LOGIC STATS (Cloud Synced) ---
    renderStats() {
        const today = new Date().toDateString();
        const stats = Storage.getGameStats();
        let { streak, lastLogin, dailyMinutes } = stats;

        // Tính Streak
        if (lastLogin !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Nếu đăng nhập hôm qua -> Tăng streak. Nếu không -> Reset 1
            if (lastLogin === yesterday.toDateString()) {
                streak++;
            } else if (lastLogin !== today) {
                streak = 1; 
            }
            // Save ngay để đồng bộ
            Storage.saveGameStats({ streak, lastLogin: today });
        }
        
        // Tính Time (Demo: +2 phút mỗi lần vào Home)
        dailyMinutes = (dailyMinutes || 0) + 2;
        Storage.saveGameStats({ dailyMinutes });

        // Render UI
        const streakEl = document.getElementById('user-streak');
        const timeEl = document.getElementById('study-time');
        const wordsEl = document.getElementById('weekly-words');

        if(streakEl) streakEl.innerText = streak;
        if(timeEl) timeEl.innerText = `${dailyMinutes}p`;
        
        // Số từ vựng
        const vocabList = Storage.get('vocab_list');
        if(wordsEl) wordsEl.innerText = vocabList.length;
    }
};