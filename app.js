/**
 * Router chính của ứng dụng
 * Tự động load HTML, CSS, JS dựa trên tên tab
 */

const APP_CONTAINER = document.getElementById('app');

// PATCH_v3: Fix Audio Leak + SPA Core
async function loadTab(tabName) {
    // 0. STOP AUDIO TOÀN HỆ THỐNG (Quan trọng)
    window.speechSynthesis.cancel(); 

    // 1. Ẩn tất cả tab hiện tại
    Array.from(APP_CONTAINER.children).forEach(child => child.style.display = 'none');

    // 2. Check xem tab đã load chưa?
    let tabView = document.getElementById(`tab-${tabName}`);

    if (tabView) {
        // A. Đã có -> Hiện lên ngay lập tức (0 độ trễ)
        tabView.style.display = 'block';
    } else {
        // B. Chưa có -> Fetch & Tạo mới
        try {
            const response = await fetch(`tabs/${tabName}/${tabName}.html`);
            if (!response.ok) throw new Error(`Missing tab: ${tabName}`);
            const html = await response.text();

            // Tạo wrapper div
            tabView = document.createElement('div');
            tabView.id = `tab-${tabName}`;
            tabView.className = 'tab-view fade-in'; // Thêm class animation
            tabView.innerHTML = html;
            APP_CONTAINER.appendChild(tabView);

            // Load CSS (Lazy load)
            if (!document.getElementById(`css-${tabName}`)) {
                const link = document.createElement('link');
                link.id = `css-${tabName}`;
                link.rel = 'stylesheet';
                link.href = `tabs/${tabName}/${tabName}.css`;
                document.head.appendChild(link);
            }

            // Load JS & Init
            const module = await import(`./tabs/${tabName}/${tabName}.js`);
            if (module.default && typeof module.default.init === 'function') {
                module.default.init();
                // Lưu reference để gọi refresh nếu cần
                tabView.dataset.hasModule = "true";
            }

        } catch (error) {
            console.error(error);
            APP_CONTAINER.innerHTML += `<p class="error">Lỗi: ${error.message}</p>`;
        }
    }

    // 3. Update Menu Active
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.target === tabName);
    });
}

// Bắt sự kiện click menu
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const target = item.dataset.target;
        loadTab(target);
    });
});

// Khởi chạy mặc định
document.addEventListener('DOMContentLoaded', () => {
    loadTab('home');
});