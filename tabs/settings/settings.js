export default {
    init() {
        const currentKey = localStorage.getItem('openai_key') || '';
        document.getElementById('api-key').value = currentKey;

        document.getElementById('save-key').addEventListener('click', () => {
            const key = document.getElementById('api-key').value.trim();
            if (key) {
                localStorage.setItem('openai_key', key);
                alert("Đã lưu API Key thành công! ✅");
            } else {
                alert("Vui lòng nhập Key hợp lệ!");
            }
        });
    }
};