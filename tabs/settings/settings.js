import { Storage } from '../../services/storage.js';

export default {
    // Cache DOM elements
    els: {},

    init() {
        this.cacheDOM();
        this.loadCurrentSettings();
        this.bindEvents();
    },

    cacheDOM() {
        this.els = {
            inputKey: document.getElementById('api-key'),
            btnSave: document.getElementById('save-key'),
            btnEye: document.getElementById('btn-toggle-eye'),
            btnDelete: document.getElementById('btn-delete-key'),
            levelSelect: document.getElementById('user-level'),
            goalBtns: document.querySelectorAll('.btn-option'),
            btnExport: document.getElementById('btn-export-data')
        };
    },

    loadCurrentSettings() {
        const settings = Storage.getSettings();

        // 1. Load API Key (Masking sẵn)
        if (settings.apiKey) {
            this.els.inputKey.value = settings.apiKey;
            this.els.btnDelete.style.display = 'block';
        }

        // 2. Load Level
        this.els.levelSelect.value = settings.level;

        // 3. Load Goal (Active class)
        this.els.goalBtns.forEach(btn => {
            const val = parseInt(btn.dataset.goal);
            btn.classList.toggle('active', val === settings.dailyGoal);
        });
    },

    bindEvents() {
        // --- A. Toggle Ẩn/Hiện Key ---
        this.els.btnEye.addEventListener('click', () => {
            const type = this.els.inputKey.getAttribute('type') === 'password' ? 'text' : 'password';
            this.els.inputKey.setAttribute('type', type);
            this.els.btnEye.innerText = type === 'password' ? '👁️' : '🙈';
        });

        // --- B. Lưu API Key (Validate + UX) ---
        this.els.btnSave.addEventListener('click', () => this.handleSaveKey());

        // --- C. Xóa Key ---
        this.els.btnDelete.addEventListener('click', () => {
            if (confirm("Bạn có chắc muốn xóa API Key? Các tính năng AI sẽ không hoạt động.")) {
                Storage.saveSettings({ apiKey: '' });
                this.els.inputKey.value = '';
                this.els.btnDelete.style.display = 'none';
                alert("Đã xóa Key thành công!");
            }
        });

        // --- D. Chọn Goal (Auto save) ---
        this.els.goalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI update
                this.els.goalBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Logic save
                const goal = parseInt(e.target.dataset.goal);
                Storage.saveSettings({ dailyGoal: goal });
            });
        });

        // --- E. Chọn Level (Auto save) ---
        this.els.levelSelect.addEventListener('change', (e) => {
            Storage.saveSettings({ level: e.target.value });
        });
        
        // --- F. Export (Bonus) ---
        this.els.btnExport.addEventListener('click', () => {
            const data = {
                settings: Storage.getSettings(),
                vocab: Storage.get('vocab_list'),
                history: Storage.get('listening_history')
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "wordstock_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    },

    handleSaveKey() {
        let key = this.els.inputKey.value;
        
        // 1. Validate: Trim & Check Empty
        key = key.trim();
        if (!key) {
            alert("Vui lòng nhập API Key!");
            return;
        }

        // 2. Validate format cơ bản (Optional)
        if (!key.startsWith('sk-')) {
            if(!confirm("Key này có vẻ không đúng định dạng 'sk-...'. Bạn có chắc chắn muốn lưu?")) return;
        }

        // 3. UX: Loading State
        const originalText = this.els.btnSave.innerText;
        this.els.btnSave.innerText = "⏳ Saving...";
        this.els.btnSave.disabled = true;

        // Giả lập delay nhẹ để user cảm nhận được app đang xử lý
        setTimeout(() => {
            // 4. Lưu vào Storage (Object)
            Storage.saveSettings({ apiKey: key });

            // 5. UX: Success State
            this.els.btnSave.innerText = "✅ Đã lưu thành công";
            this.els.btnSave.classList.remove('btn--primary');
            this.els.btnSave.classList.add('btn--outline'); // Đổi màu để báo hiệu xong
            this.els.btnDelete.style.display = 'block';

            // Reset nút sau 2s
            setTimeout(() => {
                this.els.btnSave.innerText = originalText;
                this.els.btnSave.disabled = false;
                this.els.btnSave.classList.add('btn--primary');
                this.els.btnSave.classList.remove('btn--outline');
                // Auto hide key
                this.els.inputKey.setAttribute('type', 'password');
                this.els.btnEye.innerText = '👁️';
            }, 2000);

        }, 600);
    }
};