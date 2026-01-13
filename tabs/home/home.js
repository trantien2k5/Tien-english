export default {
    init() {
        this.checkNewDay();
        this.renderDailyPlan();
        this.renderStats(); // Gọi hàm render chỉ số

        // Expose hàm startTask ra window để gọi từ HTML
        window.startTask = (taskType) => this.handleTaskClick(taskType);
    },

    // --- 1. LOGIC DAILY PLAN ---
    checkNewDay() {
        const today = new Date().toDateString();
        const lastPlanDate = localStorage.getItem('daily_plan_date');
        
        if (lastPlanDate !== today) {
            const initialTasks = { vocab: false, listening: false, speaking: false };
            localStorage.setItem('daily_tasks', JSON.stringify(initialTasks));
            localStorage.setItem('daily_plan_date', today);
        }
    },

    renderDailyPlan() {
        const tasks = JSON.parse(localStorage.getItem('daily_tasks')) || { vocab: false, listening: false, speaking: false };
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

    handleTaskClick(taskType) {
        const tasks = JSON.parse(localStorage.getItem('daily_tasks')) || {};
        tasks[taskType] = true;
        localStorage.setItem('daily_tasks', JSON.stringify(tasks));

        // Chuyển tab
        const navItem = document.querySelector(`.nav-item[data-target="${taskType}"]`);
        if (navItem) {
            navItem.click();
        }
        
        // Re-render để thấy trạng thái mới ngay (nếu quay lại)
        this.renderDailyPlan();
    },

    // --- 2. LOGIC STATS (STREAK, TIME) ---
    renderStats() {
        // Xử lý Streak
        const today = new Date().toDateString();
        const lastLogin = localStorage.getItem('last_login_date');
        let streak = parseInt(localStorage.getItem('user_streak') || '0');

        if (lastLogin !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastLogin === yesterday.toDateString()) {
                streak++;
            } else {
                streak = 1;
            }
            localStorage.setItem('last_login_date', today);
            localStorage.setItem('user_streak', streak);
        }
        
        // Xử lý Time (Giả lập tăng thời gian mỗi lần vào Home)
        let dailyMins = parseInt(localStorage.getItem('daily_minutes') || '0');
        // Cộng thêm 2 phút mỗi lần load trang Home (Demo)
        dailyMins += 2; 
        localStorage.setItem('daily_minutes', dailyMins);

        // Hiển thị lên giao diện
        const streakEl = document.getElementById('user-streak');
        const timeEl = document.getElementById('study-time');
        const wordsEl = document.getElementById('weekly-words');

        if(streakEl) streakEl.innerText = streak;
        if(timeEl) timeEl.innerText = `${dailyMins}p`;
        
        // Lấy số từ vựng thật
        const vocabList = JSON.parse(localStorage.getItem('vocab_list') || '[]');
        if(wordsEl) wordsEl.innerText = vocabList.length;
    }
};