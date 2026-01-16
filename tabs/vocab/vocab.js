// Thay đổi import
import { askAI } from '../../services/ai.js'; // Kiểm tra đường dẫn ai.js của bạn
import { Storage } from '../../services/storage.js'; // IMPORT MỚI

// PATCH_v2: Logic Core & AI Generator
export default {
    topics: [],
    activeTopic: null,
    
    init() {
        this.loadTopics();
        this.renderDashboard();
        this.bindEvents();
    },

    loadTopics() {
        const raw = localStorage.getItem('topic_list');
        this.topics = raw ? JSON.parse(raw) : [];
    },

    saveTopics() {
        localStorage.setItem('topic_list', JSON.stringify(this.topics));
        this.renderDashboard();
    },

    bindEvents() {
        // Navigation Views
        document.getElementById('btn-create-topic').onclick = () => this.switchView('generator');
        document.getElementById('btn-back-dash').onclick = () => this.switchView('dashboard');
        
        // AI Generator
        document.getElementById('btn-start-gen').onclick = () => this.handleGenerate();
        
        // Player Events (Sẽ bổ sung ở Step 4)
    },

    switchView(viewName) {
        ['dashboard', 'generator', 'player'].forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) el.style.display = (v === viewName) ? 'block' : 'none';
        });
    },

    renderDashboard() {
        const grid = document.getElementById('topic-grid');
        if (!grid) return;
        
        if (this.topics.length === 0) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#94a3b8; margin-top:20px">
                Chưa có chủ đề nào. Hãy nhờ AI tạo giúp nhé! 🤖
            </p>`;
            return;
        }

        grid.innerHTML = this.topics.map((t, idx) => `
            <div class="topic-card" onclick="window.openTopic(${idx})">
                <div class="tc-title">${t.title}</div>
                <div class="tc-info">
                    <span>📚 ${t.words.length} từ</span> • 
                    <span>${t.level}</span>
                </div>
            </div>
        `).join('');

        // Expose function for onclick
        window.openTopic = (idx) => this.startPlayer(this.topics[idx]);
    },

    async handleGenerate() {
        const topicName = document.getElementById('gen-topic').value;
        const qty = document.getElementById('gen-qty').value;
        const level = document.getElementById('gen-level').value;
        const context = document.getElementById('gen-context').value || "General communication";

        if (!topicName) return alert("Vui lòng nhập tên chủ đề!");

        // UI Loading
        document.getElementById('gen-loader').style.display = 'block';
        document.getElementById('btn-start-gen').disabled = true;

        const prompt = `
            Act as an English Teacher. Create a vocabulary list.
            Topic: "${topicName}". Context: "${context}". Level: ${level}. Quantity: ${qty}.
            
            Return valid JSON only:
            {
                "title": "English Topic Name",
                "words": [
                    {
                        "word": "word",
                        "ipa": "/ipa/",
                        "type": "n/v/adj",
                        "meaning": "Vietnamese meaning",
                        "example_en": "Example sentence related to context",
                        "example_vi": "Vietnamese translation"
                    }
                ]
            }
        `;

        try {
            const raw = await askAI(prompt, "You are a JSON Vocab Generator.");
            const data = JSON.parse(raw.replace(/```json|```/g, '').trim());

            // Add meta data
            data.id = Date.now();
            data.level = level;
            data.createdAt = new Date().toLocaleDateString();

            // Save & Redirect
            this.topics.unshift(data);
            this.saveTopics();
            this.switchView('dashboard');
            alert(`Đã tạo chủ đề "${data.title}" thành công! 🎉`);

        } catch (err) {
            console.error(err);
            alert("Lỗi AI: " + err.message);
        } finally {
            document.getElementById('gen-loader').style.display = 'none';
            document.getElementById('btn-start-gen').disabled = false;
        }
    },

    // PATCH_v2: Logic Core & AI Generator (Giữ nguyên phần trên)

    // --- PLAYER LOGIC ---
    playerState: {
        words: [],
        index: 0,
        isFlipped: false,
        autoPlay: true
    },

    startPlayer(topicData) {
        this.playerState.words = topicData.words;
        this.playerState.index = 0;
        this.playerState.isFlipped = false;
        
        document.getElementById('player-title').innerText = topicData.title;
        this.switchView('player');
        this.renderCard();

        // Bind Player Controls
        document.getElementById('btn-exit-player').onclick = () => {
            window.speechSynthesis.cancel();
            this.switchView('dashboard');
        };
        
        document.getElementById('active-card').onclick = () => this.flipCard();
        document.getElementById('btn-next-card').onclick = () => this.nextCard();
        document.getElementById('btn-prev-card').onclick = () => this.prevCard();
        
        const btnAuto = document.getElementById('btn-auto-play');
        btnAuto.onclick = () => {
            this.playerState.autoPlay = !this.playerState.autoPlay;
            btnAuto.classList.toggle('active', this.playerState.autoPlay);
            if(this.playerState.autoPlay) this.playAudio();
        };
    },

    renderCard() {
        const { words, index } = this.playerState;
        const word = words[index];
        
        // Update Content
        document.getElementById('fc-word').innerText = word.word;
        document.getElementById('fc-ipa').innerText = word.ipa;
        document.getElementById('fc-type').innerText = word.type;
        
        document.getElementById('fc-meaning').innerText = word.meaning;
        document.getElementById('fc-en').innerText = `"${word.example_en}"`;
        document.getElementById('fc-vi').innerText = word.example_vi;
        
        document.getElementById('player-progress').innerText = `${index + 1}/${words.length}`;

        // Reset Flip State
        const card = document.getElementById('active-card');
        card.classList.remove('is-flipped');
        this.playerState.isFlipped = false;

        // Auto Audio
        if (this.playerState.autoPlay) {
            setTimeout(() => this.playAudio(), 500);
        }
    },

    flipCard() {
        const card = document.getElementById('active-card');
        this.playerState.isFlipped = !this.playerState.isFlipped;
        card.classList.toggle('is-flipped', this.playerState.isFlipped);
    },

    nextCard() {
        if (this.playerState.index < this.playerState.words.length - 1) {
            this.playerState.index++;
            this.renderCard();
        } else {
            alert("Đã hết thẻ! 🎉");
        }
    },

    prevCard() {
        if (this.playerState.index > 0) {
            this.playerState.index--;
            this.renderCard();
        }
    },

    playAudio() {
        const word = this.playerState.words[this.playerState.index];
        this.speak(word.word);
    },

    speak(text) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
    }
};