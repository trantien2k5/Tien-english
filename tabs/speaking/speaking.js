import { askAI } from '../../data.js';

export default {
    init() {
        const btn = document.getElementById('btn-record');
        const status = document.getElementById('status-text');
        const transcriptEl = document.getElementById('user-transcript');
        const aiBox = document.getElementById('ai-feedback-box');
        const aiContent = document.getElementById('ai-content');
        const wave = document.getElementById('wave-animation');

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';

        btn.addEventListener('click', () => {
            recognition.start();
            status.innerText = "Đang lắng nghe...";
            btn.style.backgroundColor = "var(--color-danger)";
            if(wave) wave.style.display = 'flex';
        });

        recognition.onresult = async (event) => {
            const text = event.results[0][0].transcript;
            
            // Reset UI
            btn.style.backgroundColor = "";
            status.innerText = "Đã nhận xong!";
            if(wave) wave.style.display = 'none';
            transcriptEl.innerText = `"${text}"`;

            // Call AI
            aiBox.style.display = 'block';
            aiContent.innerHTML = '<div class="loader"></div> Đang phân tích...';

            try {
                const prompt = `Check grammar and naturalness for this sentence: "${text}". If it's wrong, correct it and explain why shortly.`;
                const reply = await askAI(prompt);
                aiContent.innerHTML = reply;
            } catch (err) {
                aiContent.innerHTML = `<span class="text-danger">${err.message}</span>`;
            }
        };

        recognition.onerror = () => {
            status.innerText = "Lỗi nhận diện, thử lại!";
            btn.style.backgroundColor = "";
            if(wave) wave.style.display = 'none';
        };
    }
};