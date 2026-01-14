import { Storage } from '../../services/storage.js';

export default {
    // Cache
    els: {},
    settings: {},
    currentFilter: 'all', // State cho bộ lọc

    init() {
        this.cacheDOM();
        this.loadSettings();
        this.renderPreviews();
        this.bindEvents();
        
        // Init Library (Code mới)
        this.updateLibCount(); 
        this.bindLibraryEvents();
    },

    cacheDOM() {
        this.els = {
            // --- Settings UI ---
            items: document.querySelectorAll('.setting-item'),
            userName: document.getElementById('user-name'),
            userLevel: document.getElementById('user-level'),
            goalOptions: document.querySelectorAll('#goal-options .btn-option'),
            vocabNew: document.getElementById('vocab-limit-new'),
            vocabReview: document.getElementById('vocab-limit-review'),
            apiKey: document.getElementById('api-key'),
            btnSaveKey: document.getElementById('save-key'),
            btnDeleteKey: document.getElementById('delete-key'),
            btnEye: document.getElementById('btn-toggle-eye'),
            btnExport: document.getElementById('btn-export'),
            fileImport: document.getElementById('file-import'),
            btnReset: document.getElementById('btn-reset-all'),
            // Elements hiển thị preview
            prevProfile: document.getElementById('preview-profile'),
            prevGoal: document.getElementById('preview-goal'),
            prevVocab: document.getElementById('preview-vocab'),
            prevAi: document.getElementById('preview-ai'),
        };
    },

    loadSettings() {
        this.settings = Storage.getSettings();

        // Fill Data vào Inputs
        this.els.userName.value = this.settings.username || '';
        this.els.userLevel.value = this.settings.level || 'A1';
        this.els.vocabNew.value = this.settings.vocabLimitNew || 5;
        this.els.vocabReview.value = this.settings.vocabLimitReview || 10;

        if (this.settings.apiKey) {
            this.els.apiKey.value = this.settings.apiKey;
            this.els.btnDeleteKey.style.display = 'block';
            this.els.btnSaveKey.innerText = "Cập nhật";
        } else {
            this.els.btnDeleteKey.style.display = 'none';
        }

        // Active Goal Button
        this.els.goalOptions.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.val) === (this.settings.dailyGoal || 10));
        });
    },

    // 🔥 Cập nhật dòng chữ bên phải (Preview)
    renderPreviews() {
        // 1. Profile
        const name = this.settings.username || 'Student';
        this.els.prevProfile.innerText = `${name} • ${this.settings.level || 'A1'}`;

        // 2. Goal
        this.els.prevGoal.innerText = `${this.settings.dailyGoal || 10} phút`;

        // 3. Vocab
        this.els.prevVocab.innerText = `Mới: ${this.settings.vocabLimitNew || 5} • Ôn: ${this.settings.vocabLimitReview || 10}`;

        // 4. AI
        if (this.settings.apiKey) {
            this.els.prevAi.innerText = "Đã lưu ✅";
            this.els.prevAi.style.color = "var(--color-success)";
        } else {
            this.els.prevAi.innerText = "Chưa cấu hình ⚠️";
            this.els.prevAi.style.color = "var(--color-warning)";
        }
    },

    save(key, value) {
        // Helper save nhanh & update preview
        const obj = {};
        obj[key] = value;
        Storage.saveSettings(obj);
        this.settings = Storage.getSettings(); // Reload local
        this.renderPreviews(); // Update UI ngay
    },

    bindEvents() {
        // 1. Accordion Logic (Bấm header -> Mở body)
        this.els.items.forEach(item => {
            const header = item.querySelector('.setting-header');
            header.addEventListener('click', () => {
                // Đóng các item khác (Optional - để UX gọn hơn)
                this.els.items.forEach(i => {
                    if (i !== item) i.classList.remove('active');
                });
                // Toggle item hiện tại
                item.classList.toggle('active');
            });
        });

        // 2. Profile Change (Auto Save)
        this.els.userName.addEventListener('change', (e) => this.save('username', e.target.value.trim()));
        this.els.userLevel.addEventListener('change', (e) => this.save('level', e.target.value));

        // 3. Goal Change
        this.els.goalOptions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI
                this.els.goalOptions.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Save
                this.save('dailyGoal', parseInt(e.target.dataset.val));
            });
        });

        // 4. Vocab Plan Change
        this.els.vocabNew.addEventListener('change', (e) => this.save('vocabLimitNew', parseInt(e.target.value)));
        this.els.vocabReview.addEventListener('change', (e) => this.save('vocabLimitReview', parseInt(e.target.value)));

        // 5. AI Key Logic (Giữ nguyên logic cũ nhưng gọn hơn)
        this.els.btnSaveKey.addEventListener('click', () => {
            const key = this.els.apiKey.value.trim();
            if (!key.startsWith('sk-')) {
                if (!confirm("Key không đúng định dạng 'sk-'. Vẫn lưu?")) return;
            }
            Storage.saveSettings({ apiKey: key });
            this.loadSettings(); // Reload để hiện nút Xóa
            this.renderPreviews();
            alert("Đã lưu API Key! 🤖");
        });

        this.els.btnDeleteKey.addEventListener('click', () => {
            if (confirm("Xóa API Key?")) {
                Storage.saveSettings({ apiKey: '' });
                this.els.apiKey.value = '';
                this.loadSettings();
                this.renderPreviews();
            }
        });

        this.els.btnEye.addEventListener('click', () => {
            const type = this.els.apiKey.type === 'password' ? 'text' : 'password';
            this.els.apiKey.type = type;
        });

        // 6. Export / Import
        this.els.btnExport.addEventListener('click', () => this.handleExport());
        this.els.fileImport.addEventListener('change', (e) => this.handleImport(e));

        // 7. Reset App
        this.els.btnReset.addEventListener('click', () => {
            if (confirm("⚠️ NGUY HIỂM: Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu học tập? Hành động này không thể hoàn tác!")) {
                localStorage.clear();
                location.reload();
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
        if (file) {

            reader.readAsText(file);
        }
    },

    // --- LIBRARY LOGIC ---
    updateLibCount() {
        const count = Storage.getHistory().length;
        const el = document.getElementById('lib-count');
        if(el) el.innerText = `${count} mục`;
    },

    bindLibraryEvents() {
        // Cache lại elements cho chắc chắn (Lazy cache)
        const els = {
            itemLib: document.getElementById('item-ai-lib'),
            view: document.getElementById('ai-library-view'),
            close: document.getElementById('btn-close-lib'),
            list: document.getElementById('lib-list'),
            search: document.getElementById('lib-search'),
            pills: document.querySelectorAll('.filter-pill')
        };

        // 1. Open/Close Library
        if(els.itemLib) els.itemLib.addEventListener('click', () => {
            els.view.classList.add('active');
            this.renderLibraryList();
        });
        if(els.close) els.close.addEventListener('click', () => els.view.classList.remove('active'));

        // 2. Search & Filter
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