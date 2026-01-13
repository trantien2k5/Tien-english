/**
 * Router chính của ứng dụng
 * Tự động load HTML, CSS, JS dựa trên tên tab
 */

const APP_CONTAINER = document.getElementById('app');

async function loadTab(tabName) {
    try {
        // 1. Load HTML Content
        const response = await fetch(`tabs/${tabName}/${tabName}.html`);
        if (!response.ok) throw new Error(`Không tìm thấy tab: ${tabName}`);
        const html = await response.text();
        APP_CONTAINER.innerHTML = html;

        // 2. Load CSS (nếu chưa có)
        const cssId = `css-${tabName}`;
        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = `tabs/${tabName}/${tabName}.css`;
            document.head.appendChild(link);
        }

        // 3. Load Logic JS (Dynamic Import)
        // Lưu ý: File js phải export default { init: function() {} }
        const module = await import(`./tabs/${tabName}/${tabName}.js`);
        if (module.default && typeof module.default.init === 'function') {
            module.default.init();
        }

    } catch (error) {
        console.error("Lỗi tải tab:", error);
        APP_CONTAINER.innerHTML = `<p class="text-danger">Lỗi tải trang: ${error.message}</p>`;
    }

    // Update Menu Active
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