import { askAI } from '../../data.js';

export default {
    init() {
        const btn = document.getElementById('btn-lookup');
        const input = document.getElementById('vocab-input');
        const resultCard = document.getElementById('vocab-result');
        
        btn.addEventListener('click', async () => {
            const word = input.value.trim();
            if (!word) return;

            resultCard.style.display = 'block';
            document.getElementById('v-word').innerText = word;
            document.getElementById('v-ipa').innerText = "...";
            document.getElementById('v-definition').innerHTML = '<div class="loader"></div> Đang tra cứu...';

            try {
                const prompt = `Define the word "${word}" in Vietnamese. Give IPA, 1 English example sentence, and its Vietnamese translation. Format: HTML list.`;
                const reply = await askAI(prompt);
                
                document.getElementById('v-definition').innerHTML = reply;
                document.getElementById('v-ipa').innerText = `/ Phiên âm từ AI /`; 
            } catch (err) {
                document.getElementById('v-definition').innerHTML = `<span class="text-danger">Lỗi: ${err.message}</span>`;
            }
        });
    }
};