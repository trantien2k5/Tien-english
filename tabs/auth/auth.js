export default {
    // PATCH_DEPLOY: Kết nối Backend thật
    API_URL: 'https://wordstock-auth.trantien.workers.dev/',

    init() {
        // Expose function cho HTML gọi
        window.switchAuth = (mode) => this.toggleForm(mode);

        // Bind Events
        document.getElementById('form-login').onsubmit = (e) => this.handleLogin(e);
        document.getElementById('form-register').onsubmit = (e) => this.handleRegister(e);
    },

    toggleForm(mode) {
        const loginForm = document.getElementById('form-login');
        const regForm = document.getElementById('form-register');
        const title = document.getElementById('auth-title');

        if (mode === 'register') {
            loginForm.style.display = 'none';
            regForm.style.display = 'block';
            title.innerText = "Tạo tài khoản mới 🚀";
        } else {
            loginForm.style.display = 'block';
            regForm.style.display = 'none';
            title.innerText = "Chào mừng trở lại! 👋";
        }
        document.getElementById('auth-msg').innerText = '';
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('l-email').value;
        const password = document.getElementById('l-pass').value;
        const btn = e.target.querySelector('button');
        
        this.setLoading(btn, true);

        try {
            const res = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Đăng nhập thành công -> Lưu Token
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_info', JSON.stringify(data.user));
            
            // Lưu vào Settings để app nhận diện
            const settings = JSON.parse(localStorage.getItem('wordstock_settings_v1') || '{}');
            settings.username = data.user.name;
            localStorage.setItem('wordstock_settings_v1', JSON.stringify(settings));

            // PATCH_v6: Trigger Sync
            alert(`Xin chào ${data.user.name}! 🎉 Đang đồng bộ dữ liệu...`);
            
            // Import Storage động để tránh vòng lặp dependency
            const { Storage } = await import('../../services/storage.js');
            await Storage.syncAll(); // Tải dữ liệu về & Reload

        } catch (err) {
            document.getElementById('auth-msg').innerText = err.message;
        } finally {
            this.setLoading(btn, false);
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('r-name').value;
        const email = document.getElementById('r-email').value;
        const password = document.getElementById('r-pass').value;
        const btn = e.target.querySelector('button');

        this.setLoading(btn, true);

        try {
            const res = await fetch(`${this.API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("Đăng ký thành công! Hãy đăng nhập ngay.");
            this.toggleForm('login');
            // Auto fill email
            document.getElementById('l-email').value = email;

        } catch (err) {
            document.getElementById('auth-msg').innerText = err.message;
        } finally {
            this.setLoading(btn, false);
        }
    },

    setLoading(btn, isLoading) {
        if(isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<div class="loader" style="width:20px;height:20px;border-width:2px"></div>';
        } else {
            btn.disabled = false;
            btn.innerText = 'Tiếp tục';
        }
    }
};