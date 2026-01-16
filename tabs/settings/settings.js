import { Storage } from '../../services/storage.js';

export default {
    // Cache Elements
    els: {},
    settings: {},
    currentFilter: 'all',

    init() {
        this.cacheDOM();
        this.loadSettings();
        this.bindEvents();
        
        // Init Library
        this.updateLibCount(); 
        this.bindLibraryEvents();
    },

    cacheDOM() {
        this.els = {
            // Accordion Items
            items: document.querySelectorAll('.setting-item'),
            
            // Profile & Display
            dispName: document.getElementById('disp-name'),
            dispLevel: document.getElementById('disp-level'),
            dispStreak: document.getElementById('disp-streak'),
            
            // Inputs: Personalization
            inpUsername: document.getElementById('inp-username'),
            inpLevel: document.getElementById('inp-level'),
            inpGoalTarget: document.getElementById('inp-goal-target'),
            inpDailySlider: document.getElementById('inp-daily-slider'),
            valDaily: document.getElementById('val-daily'),
            inpReminder: document.getElementById('inp-reminder'),
            
            // Vocab
            modeBtns: document.querySelectorAll('.mode-btn'),
            valVNew: document.getElementById('val-v-new'),
            valVReview: document.getElementById('val-v-review'),

            // Learning & Experience
            // PATCH_v2
            dispGoal: document.getElementById('disp-goal'),
            inpAutoNext: document.getElementById('inp-auto-next'),
            inpShowScript: document.getElementById('inp-show-script'),
            inpAutoReplay: document.getElementById('inp-auto-replay'),
            inpHideVi: document.getElementById('inp-hide-vi'),
            inpReflex: document.getElementById('inp-reflex'),
            inpDarkMode: document.getElementById('inp-dark-mode'),
            inpSound: document.getElementById('inp-sound'),
            
            // System
            apiKey: document.getElementById('api-key'),
            inpAiMode: document.getElementById('inp-ai-mode'),
            btnSaveKey: document.getElementById('save-key'),
            btnDeleteKey: document.getElementById('delete-key'),
            btnEye: document.getElementById('btn-toggle-eye'),
            btnExport: document.getElementById('btn-export'),
            fileImport: document.getElementById('file-import'),
            btnReset: document.getElementById('btn-reset-all'),

            // Chips Previews
            chipGoal: document.getElementById('chip-goal'),
            chipDaily: document.getElementById('chip-daily'),
            chipVocab: document.getElementById('chip-vocab'),
            chipAi: document.getElementById('chip-ai'),
        };
    },

    // PATCH_v2
    loadSettings() {
        this.settings = Storage.getSettings();
        
        // 1. Profile & Stats
        if(this.els.inpUsername) this.els.inpUsername.value = this.settings.username || 'Student';
        if(this.els.inpLevel) this.els.inpLevel.value = this.settings.level || 'A1';
        if(this.els.inpGoalTarget) this.els.inpGoalTarget.value = this.settings.goalTarget || 'communication';
        
        if(this.els.dispName) this.els.dispName.innerText = this.settings.username || 'Student';
        if(this.els.dispLevel) this.els.dispLevel.innerText = this.settings.level || 'A1';
        if(this.els.dispStreak) this.els.dispStreak.innerText = Storage.getStats().streak || 0;
        
        const currentMins = parseInt(localStorage.getItem('daily_minutes') || '0');
        if(this.els.dispGoal) this.els.dispGoal.innerText = `🎯 ${currentMins}/${this.settings.dailyGoal || 15}p`;

        // 2. Goal & Vocab
        if(this.els.inpDailySlider) {
            this.els.inpDailySlider.value = this.settings.dailyGoal || 15;
            if(this.els.valDaily) this.els.valDaily.innerText = this.settings.dailyGoal || 15;
        }
        if(this.els.inpReminder) this.els.inpReminder.checked = !!this.settings.reminderTime;

        const mode = this.settings.vocabMode || 'balanced';
        this.updateVocabUI(mode);
        this.els.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

        // 3. Learning & System
        if(this.els.inpAutoNext) this.els.inpAutoNext.checked = this.settings.autoPlayNext;
        if(this.els.inpShowScript) this.els.inpShowScript.checked = this.settings.showScriptAfter;
        if(this.els.inpAutoReplay) this.els.inpAutoReplay.checked = this.settings.autoReplayWrong;
        if(this.els.inpHideVi) this.els.inpHideVi.checked = this.settings.hideVietnamese;
        if(this.els.inpReflex) this.els.inpReflex.checked = this.settings.reflexMode;
        
        if(this.els.inpDarkMode) {
            this.els.inpDarkMode.checked = this.settings.darkMode;
            document.body.classList.toggle('dark-theme', this.settings.darkMode);
        }
        if(this.els.inpSound) this.els.inpSound.checked = this.settings.soundEffects;
        if(this.els.inpAiMode) this.els.inpAiMode.value = this.settings.aiMode || 'speed';

        // 4. API Key (Sync Fix: Luôn gán giá trị để clear input khi key rỗng)
        if(this.els.apiKey) this.els.apiKey.value = this.settings.apiKey || '';

        if (this.settings.apiKey) {
            if(this.els.btnDeleteKey) this.els.btnDeleteKey.style.display = 'block';
            if(this.els.btnSaveKey) this.els.btnSaveKey.innerText = "Cập nhật";
        } else {
            if(this.els.btnDeleteKey) this.els.btnDeleteKey.style.display = 'none';
            if(this.els.btnSaveKey) this.els.btnSaveKey.innerText = "Lưu Key";
        }

        this.renderPreviews();
    },

    updateVocabUI(mode) {
        let newCount = 5, revCount = 10;
        if(mode === 'light') { newCount=3; revCount=5; }
        if(mode === 'intense') { newCount=10; revCount=20; }
        
        if(this.els.valVNew) this.els.valVNew.innerText = newCount;
        if(this.els.valVReview) this.els.valVReview.innerText = revCount;
    },

    renderPreviews() {
        const goalMap = { communication: '🗣️ Giao tiếp', ielts: '🎓 IELTS', work: '💼 Đi làm', travel: '✈️ Du lịch' };
        
        if(this.els.chipGoal) this.els.chipGoal.innerText = goalMap[this.settings.goalTarget] || 'Chưa chọn';
        if(this.els.chipDaily) this.els.chipDaily.innerText = `${this.settings.dailyGoal || 15} phút`;
        
        const mode = this.settings.vocabMode || 'balanced';
        if(this.els.chipVocab) this.els.chipVocab.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
        
        if(this.els.chipAi) {
            if (this.settings.apiKey) {
                this.els.chipAi.innerText = "Đã lưu ✅";
                this.els.chipAi.classList.add('green');
            } else {
                this.els.chipAi.innerText = "Chưa có";
                this.els.chipAi.classList.remove('green');
            }
        }
    },

    save(key, value) {
        const obj = {};
        obj[key] = value;
        Storage.saveSettings(obj);
        // Sync Fix: Reload toàn bộ Settings để update cả Header Profile & Input
        this.loadSettings(); 
    },

    bindEvents() {
        // PATCH_v2: Popup Flow Logic (Scroll Lock Fixed)
        const overlay = document.getElementById('setting-overlay');
        const toggleScroll = (lock) => document.body.classList.toggle('no-scroll', lock);

        this.els.items.forEach(item => {
            // Close Button Logic
            const body = item.querySelector('.setting-body');
            if(body && !body.querySelector('.btn-popup-close')) {
                const btn = document.createElement('button');
                btn.className = 'btn-popup-close';
                btn.innerHTML = '✕';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    item.classList.remove('active');
                    if(overlay) overlay.classList.remove('active');
                    toggleScroll(false); // Mở cuộn
                };
                body.prepend(btn);
            }

            item.querySelector('.setting-header')?.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                this.els.items.forEach(i => i.classList.remove('active')); // Reset all
                
                if (!isActive) {
                    item.classList.add('active');
                    if(overlay) overlay.classList.add('active');
                    toggleScroll(true); // Khóa cuộn
                } else {
                    if(overlay) overlay.classList.remove('active');
                    toggleScroll(false);
                }
            });
        });

        if(overlay) {
            overlay.addEventListener('click', () => {
                this.els.items.forEach(i => i.classList.remove('active'));
                overlay.classList.remove('active');
                toggleScroll(false);
            });
        }

        // --- Inputs Change Events (SAFE MODE: Use ?. to prevent crash) ---
        
        this.els.inpUsername?.addEventListener('change', (e) => this.save('username', e.target.value));
        this.els.inpLevel?.addEventListener('change', (e) => this.save('level', e.target.value));
        this.els.inpGoalTarget?.addEventListener('change', (e) => this.save('goalTarget', e.target.value));
        
        // PATCH_v2: Handle Save Button
        document.getElementById('btn-save-profile')?.addEventListener('click', () => {
            // Đóng popup
            document.getElementById('item-profile').classList.remove('active');
            document.getElementById('setting-overlay').classList.remove('active');
            // Feedback
            alert(`Đã cập nhật hồ sơ: ${this.settings.username} (${this.settings.level}) ✅`);
        });

        this.els.inpDailySlider?.addEventListener('input', (e) => {
            if(this.els.valDaily) this.els.valDaily.innerText = e.target.value;
        });
        this.els.inpDailySlider?.addEventListener('change', (e) => this.save('dailyGoal', parseInt(e.target.value)));
        this.els.inpReminder?.addEventListener('change', (e) => this.save('reminderTime', e.target.checked ? "20:00" : ""));

        this.els.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.updateVocabUI(mode);
                this.save('vocabMode', mode);
                this.loadSettings(); 
            });
        });

        const bindToggle = (el, key) => {
            if(el) el.addEventListener('change', (e) => this.save(key, e.target.checked));
        };
        // PATCH_v2
        bindToggle(this.els.inpAutoNext, 'autoPlayNext');
        bindToggle(this.els.inpShowScript, 'showScriptAfter');
        bindToggle(this.els.inpAutoReplay, 'autoReplayWrong');
        bindToggle(this.els.inpHideVi, 'hideVietnamese');
        bindToggle(this.els.inpReflex, 'reflexMode');

        // Haptic Feedback for Sound Toggle
        if(this.els.inpSound) {
            this.els.inpSound.addEventListener('change', (e) => {
                this.save('soundEffects', e.target.checked);
                if(e.target.checked && navigator.vibrate) navigator.vibrate(50);
            });
        }
        
        this.els.inpDarkMode?.addEventListener('change', (e) => {
            this.save('darkMode', e.target.checked);
            document.body.classList.toggle('dark-theme', e.target.checked);
        });

        this.els.inpAiMode?.addEventListener('change', (e) => this.save('aiMode', e.target.value));

        // Buttons
        this.els.btnSaveKey?.addEventListener('click', () => {
            const key = this.els.apiKey.value.trim();
            Storage.saveSettings({ apiKey: key });
            this.loadSettings();
            alert("Đã lưu API Key! 🤖");
        });
        
        this.els.btnDeleteKey?.addEventListener('click', () => {
            if(confirm("Xóa API Key?")) {
                Storage.saveSettings({ apiKey: '' });
                if(this.els.apiKey) this.els.apiKey.value = '';
                this.loadSettings();
            }
        });

        this.els.btnEye?.addEventListener('click', () => {
            if(this.els.apiKey) this.els.apiKey.type = this.els.apiKey.type === 'password' ? 'text' : 'password';
        });

        this.els.btnExport?.addEventListener('click', () => this.handleExport());
        this.els.fileImport?.addEventListener('change', (e) => this.handleImport(e));
        this.els.btnReset?.addEventListener('click', () => {
            if (confirm("⚠️ Xóa TOÀN BỘ dữ liệu?")) {
                localStorage.clear();
                location.reload();
            }
        });
        
        // Edit Profile Button (Header)
        const btnEdit = document.getElementById('btn-edit-profile');
        if(btnEdit) btnEdit.addEventListener('click', () => {
            const itemProfile = document.getElementById('item-profile');
            if(itemProfile) {
                // Mở accordion profile và scroll tới đó
                itemProfile.classList.add('active');
                itemProfile.scrollIntoView({behavior: 'smooth'});
            }
        });
    },

    handleExport() {
        const data = {
            settings: Storage.getSettings(),
            vocab: JSON.parse(localStorage.getItem('vocab_list') || '[]'),
            history: JSON.parse(localStorage.getItem('listening_history') || '[]'),
            streak: localStorage.getItem('user_streak')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wordstock_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    },

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.settings) Storage.saveSettings(data.settings);
                if (data.vocab) localStorage.setItem('vocab_list', JSON.stringify(data.vocab));
                if (data.history) localStorage.setItem('listening_history', JSON.stringify(data.history));
                if (data.streak) localStorage.setItem('user_streak', data.streak);

                alert("Khôi phục dữ liệu thành công! App sẽ tải lại. 🔄");
                location.reload();
            } catch (err) {
                alert("File lỗi! Không thể import.");
            }
        };
        reader.readAsText(file);
    },

    // --- LIBRARY LOGIC ---
    updateLibCount() {
        const list = Storage.getHistory();
        const count = list.length;
        
        // Chip Header
        const chip = document.getElementById('lib-count');
        if(chip) chip.innerText = `${count} mục`;

        // Detail
        const detail = document.getElementById('lib-count-detail');
        if(detail) detail.innerText = `${count} items`;
    },

    bindLibraryEvents() {
        const els = {
            btnOpen: document.querySelector('#item-ai-lib .btn--primary'), // Nút Mở thư viện trong body accordion
            view: document.getElementById('ai-library-view'),
            close: document.getElementById('btn-close-lib'),
            search: document.getElementById('lib-search'),
            pills: document.querySelectorAll('.filter-pill')
        };

        if(els.btnOpen) els.btnOpen.addEventListener('click', () => {
            if(els.view) els.view.classList.add('active');
            this.renderLibraryList();
        });
        
        if(els.close) els.close.addEventListener('click', () => els.view?.classList.remove('active'));

        // (Deleted Modal Logic - Settings is now a standard tab)

        if(els.search) els.search.addEventListener('input', (e) => this.renderLibraryList(e.target.value));
        
        if(els.pills) els.pills.forEach(btn => {
            btn.addEventListener('click', () => {
                els.pills.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.type;
                this.renderLibraryList(els.search ? els.search.value : '');
            });
        });
    },

    renderLibraryList(query = '') {
        const listEl = document.getElementById('lib-list');
        if(!listEl) return;
        
        const data = Storage.getHistory(this.currentFilter, query);
        if(data.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px">Không tìm thấy dữ liệu 📭</p>';
            return;
        }

        listEl.innerHTML = data.map(item => `
            <div class="lib-card">
                <div class="lc-header">
                    <span class="lc-badge badge-${item.type}">${item.type.toUpperCase()}</span>
                </div>
                <div class="lc-title">${item.title}</div>
                <div class="lc-snippet">${item.snippet || ''}</div>
                <div class="lc-date">📅 ${new Date(item.createdAt).toLocaleDateString()}</div>
            </div>
        `).join('');
    },
};