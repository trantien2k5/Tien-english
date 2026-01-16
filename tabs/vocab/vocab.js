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

    // PATCH_v2
    async handleGenerate() {
        const topicName = document.getElementById('gen-topic').value;
        const qty = document.getElementById('gen-qty').value;
        const level = document.getElementById('gen-level').value;
        const context = document.getElementById('gen-context').value || "Daily conversation";

        if (!topicName) return alert("Vui lòng nhập tên chủ đề!");

        document.getElementById('gen-loader').style.display = 'block';
        document.getElementById('btn-start-gen').disabled = true;

        // PROMPT IMPROVED: Yêu cầu collocations và usage context
        const prompt = `
            Act as an English Coach. Create a vocabulary list.
            Topic: "${topicName}". Context: "${context}". Level: ${level}. Quantity: ${qty}.
            
            Return valid JSON only (RFC8259):
            {
                "title": "Topic Name in English",
                "words": [
                    {
                        "word": "word",
                        "ipa": "/ipa/",
                        "type": "n/v/adj",
                        "meaning": "Vietnamese meaning (short)",
                        "collocation": "Common phrase/collocation using this word (e.g. 'make a decision')",
                        "example_en": "Natural example sentence",
                        "example_vi": "Vietnamese translation"
                    }
                ]
            }
        `;

        try {
            const raw = await askAI(prompt, "You are a Vocabulary JSON API.");
            const data = JSON.parse(raw.replace(/```json|```/g, '').trim());

            data.id = Date.now();
            data.level = level;
            data.createdAt = new Date().toLocaleDateString();

            this.topics.unshift(data);
            this.saveTopics();
            this.switchView('dashboard');

        } catch (err) {
            console.error(err);
            alert("Lỗi AI: " + err.message);
        } finally {
            document.getElementById('gen-loader').style.display = 'none';
            document.getElementById('btn-start-gen').disabled = false;
        }
    },

    // --- PLAYER LOGIC (UPDATED SRS) ---
    playerState: {
        words: [],
        index: 0,
        isFlipped: false,
        autoPlay: false // Mặc định tắt để user tự học
    },

    startPlayer(topicData) {
        this.playerState.words = topicData.words;
        this.playerState.index = 0;
        this.playerState.isFlipped = false;
        
        // document.getElementById('player-title').innerText = topicData.title; // Đã xóa trong HTML mới
        this.switchView('player');
        this.renderCard();

        // Bind Events Mới
        document.getElementById('btn-exit-player').onclick = () => {
            window.speechSynthesis.cancel();
            this.switchView('dashboard');
        };

        // Flip Card
        const card = document.getElementById('active-card');
        card.onclick = (e) => {
            // Chặn click nếu bấm vào nút loa
            if(e.target.closest('button')) return; 
            this.flipCard();
        };

        // Audio Buttons
        document.getElementById('btn-speak-front').onclick = (e) => { e.stopPropagation(); this.playAudio(); };
        document.getElementById('btn-speak-back').onclick = (e) => { e.stopPropagation(); this.playAudio(); };

        // SRS Buttons
        document.getElementById('btn-forget').onclick = () => this.handleRating('forget');
        document.getElementById('btn-remember').onclick = () => this.handleRating('remember');
        
        const btnAuto = document.getElementById('btn-auto-play');
        btnAuto.onclick = () => {
            this.playerState.autoPlay = !this.playerState.autoPlay;
            btnAuto.classList.toggle('active', this.playerState.autoPlay);
            if(this.playerState.autoPlay && !this.playerState.isFlipped) {
                this.playAudio();
                setTimeout(() => this.flipCard(), 2000);
            }
        };
    },

    renderCard() {
        const { words, index } = this.playerState;
        const word = words[index];
        
        // Front
        document.getElementById('fc-word').innerText = word.word;
        document.getElementById('fc-ipa').innerText = word.ipa || '';
        document.getElementById('fc-type').innerText = word.type || 'word';
        
        // Back
        document.getElementById('fc-meaning').innerText = word.meaning;
        document.getElementById('fc-collocation').innerText = word.collocation || '...';
        document.getElementById('fc-en').innerText = `"${word.example_en}"`;
        document.getElementById('fc-vi').innerText = word.example_vi;
        
        // Progress
        const pct = ((index) / words.length) * 100;
        document.getElementById('player-bar').style.width = `${pct}%`;
        document.getElementById('player-progress').innerText = `${index + 1}/${words.length}`;

        // Reset state
        const card = document.getElementById('active-card');
        card.classList.remove('is-flipped');
        this.playerState.isFlipped = false;

        // Auto Play Logic
        if (this.playerState.autoPlay) {
            this.playAudio();
            // Tự động lật sau 2s
            setTimeout(() => {
                if(!this.playerState.isFlipped) this.flipCard();
            }, 2500);
        }
    },

    flipCard() {
        const card = document.getElementById('active-card');
        this.playerState.isFlipped = !this.playerState.isFlipped;
        card.classList.toggle('is-flipped', this.playerState.isFlipped);
    },

    // PATCH_v2
    handleRating(type) {
        const card = document.getElementById('active-card');
        const direction = type === 'remember' ? 'translateX(50px)' : 'translateX(-50px)';
        
        // 1. Swipe Animation (Giữ nguyên góc xoay hiện tại)
        // BUG FIX: Dùng transform rỗng khi reset để không ghi đè class CSS
        card.style.transform = `${direction} rotateY(${this.playerState.isFlipped ? 180 : 0}deg)`;
        card.style.opacity = '0.5';

        setTimeout(() => {
            if (this.playerState.index < this.playerState.words.length - 1) {
                this.playerState.index++;
                
                // 2. Reset Style (Quan trọng: set thành '' để xóa inline-style)
                card.style.transition = 'none';
                card.style.transform = ''; 
                card.style.opacity = '1';
                
                // Force Reflow
                void card.offsetWidth; 
                card.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                
                this.renderCard();
            } else {
                alert("Chúc mừng! Bạn đã hoàn thành bộ từ này. 🎉");
                this.switchView('dashboard');
                // Reset cho lần sau mở lại
                card.style.transform = '';
                card.style.opacity = '1';
            }
        }, 300);
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