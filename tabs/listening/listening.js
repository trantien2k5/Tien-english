import { askAI } from '../../data.js';

export default {
    init() {
        const btnGen = document.getElementById('btn-gen-listen');
        const area = document.getElementById('listen-area');
        const loader = document.getElementById('listen-loader');
        const controls = document.getElementById('player-controls');
        const btnPlay = document.getElementById('btn-play');
        const scriptBox = document.getElementById('script-content');
        
        let currentText = "";
        let isPlaying = false;

        btnGen.addEventListener('click', async () => {
            const topic = document.getElementById('listen-topic').value;
            area.style.display = 'block';
            loader.style.display = 'block';
            controls.style.display = 'none';
            scriptBox.style.display = 'none';
            
            window.speechSynthesis.cancel();

            try {
                const prompt = `Write a short, interesting story (about 100 words) about "${topic}" for English listening practice. Use simple B1 level vocabulary. Only return the story text, no intro.`;
                currentText = await askAI(prompt);
                
                loader.style.display = 'none';
                controls.style.display = 'block';
                scriptBox.innerText = currentText;
                
            } catch (err) {
                loader.innerHTML = `<p class="text-danger">Lỗi: ${err.message}</p>`;
            }
        });

        btnPlay.addEventListener('click', () => {
            if (isPlaying) {
                window.speechSynthesis.cancel();
                isPlaying = false;
                btnPlay.innerHTML = "▶️";
                document.getElementById('play-status').innerText = "Đã dừng";
            } else {
                const utterance = new SpeechSynthesisUtterance(currentText);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                
                utterance.onend = () => {
                    isPlaying = false;
                    btnPlay.innerHTML = "▶️";
                    document.getElementById('play-status').innerText = "Đã đọc xong";
                };

                window.speechSynthesis.speak(utterance);
                isPlaying = true;
                btnPlay.innerHTML = "⏸️";
                document.getElementById('play-status').innerText = "Đang đọc...";
            }
        });

        document.getElementById('btn-show-script').addEventListener('click', function() {
            if (scriptBox.style.display === 'none') {
                scriptBox.style.display = 'block';
                this.innerText = "🙈 Ẩn văn bản";
            } else {
                scriptBox.style.display = 'none';
                this.innerText = "📖 Hiện văn bản gốc";
            }
        });
    }
};