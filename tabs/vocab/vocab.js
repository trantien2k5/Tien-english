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

    // PATCH_v2
    // PATCH_v2
    renderDashboard() {
        const grid = document.getElementById('topic-grid');
        if (!grid) return;

        // 1. Get SRS Stats
        const totalTopics = this.topics.length;
        const allWords = Storage.get('vocab_list'); // Lấy từ storage tổng
        const dueWords = Storage.getDueWords();
        const mastered = allWords.filter(w => w.status === 'mastered').length;

        // Update UI Stats
        if(document.getElementById('stat-topics')) document.getElementById('stat-topics').innerText = totalTopics;
        if(document.getElementById('stat-words')) document.getElementById('stat-words').innerText = allWords.length;
        if(document.getElementById('stat-mastered')) document.getElementById('stat-mastered').innerText = mastered;

        // 2. Insert Review Action (Dynamic)
        const actionArea = document.querySelector('.vocab-action-area');
        // Xóa nút review cũ nếu có để tránh duplicate
        const oldReview = document.getElementById('btn-start-review');
        if(oldReview) oldReview.remove();

        if (dueWords.length > 0 && actionArea) {
            const reviewBtn = document.createElement('button');
            reviewBtn.id = 'btn-start-review';
            reviewBtn.className = 'btn-create-glow'; // Tái sử dụng class đẹp
            reviewBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; // Màu cam
            reviewBtn.style.marginTop = '15px';
            reviewBtn.innerHTML = `<span class="sparkle">🧠</span> Ôn tập ngay (${dueWords.length} từ)`;
            reviewBtn.onclick = () => this.startReviewSession();
            
            actionArea.appendChild(reviewBtn);
        }

        // 3. Render Grid
        if (totalTopics === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:10px">📦</div>
                <p style="color:#94a3b8;">Kho từ vựng trống.<br>Hãy tạo chủ đề đầu tiên!</p>
            </div>`;
            return;
        }

        grid.innerHTML = this.topics.map((t, idx) => `
            <div class="topic-card" onclick="window.openTopic(${idx})">
                <div class="tc-icon">${t.icon || '📝'}</div>
                <div class="tc-content">
                    <div class="tc-title">${t.title}</div>
                    <div class="tc-meta">
                        <span>${t.words?.length || 0} từ</span>
                        <span class="badge-level">${t.level || 'A1'}</span>
                    </div>
                </div>
            </div>
        `).join('');

        window.openTopic = (idx) => this.startPlayer(this.topics[idx]);
    },

    // PATCH_v2
    // PATCH_v2
    async handleGenerate() {
        const topicName = document.getElementById('gen-topic').value;
        const qty = document.getElementById('gen-qty').value;
        const level = document.getElementById('gen-level').value;
        const context = document.getElementById('gen-context').value || "Daily conversation";

        if (!topicName) return alert("Vui lòng nhập tên chủ đề!");

        document.getElementById('gen-loader').style.display = 'block';
        document.getElementById('btn-start-gen').disabled = true;

        // 1. Lấy danh sách từ đã học để tránh trùng (Lấy 100 từ gần nhất)
        const allVocab = Storage.get('vocab_list') || [];
        const excludeList = allVocab.slice(-100).map(w => w.word).join(', ');

        // PATCH_v2
        // 2. PROMPT "LEXICAL APPROACH": Học theo cụm từ (Phrases/Collocations)
        const prompt = `
            Act as an Expert English Coach focusing on **Lexical Approach**.
            Topic: "${topicName}". Context: "${context}". Level: ${level}. Quantity: ${qty}.

            ⚠️ CRITICAL INSTRUCTION:
            - Do NOT generate single isolated words (e.g. "Decision").
            - **MUST generate Collocations, Phrasal Verbs, or Common Phrases** (e.g. "Make a decision", "Run out of time", "Take responsibility").
            - Ignore words in this list: [${excludeList}].

            Return valid JSON only (RFC8259):
            {
                "title": "Topic Name (Phrases)",
                "icon": "Emoji related to topic (e.g. 💬)",
                "words": [
                    {
                        "word": "English Phrase (e.g. 'Make a decision')",
                        "ipa": "/ipa of phrase/",
                        "type": "phrase",
                        "meaning": "Vietnamese meaning (natural)",
                        "mnemonic": "A short, funny tip or story to remember this phrase in Vietnamese",
                        "collocation": "Real-life situation/context to use this",
                        "example_en": "A natural sentence using this phrase",
                        "example_vi": "Vietnamese translation"
                    }
                ]
            }
        `;

        try {
            // Dùng hàm askAI mới với tham số returnJson = true
            const data = await askAI(prompt, "You are a Smart Vocabulary JSON API.", true);

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

    // PATCH_v4: Insta-Study Render Logic
    renderCard() {
        const { words, index } = this.playerState;
        if (!words || words.length === 0) return;
        const word = words[index];
        
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if(el) el.innerText = text || '';
        };

        // 1. FRONT FACE
        setText('fc-word', word.word);
        setText('fc-ipa', word.ipa || '');
        setText('fc-type', word.type || 'word');
        
        // 2. BACK FACE
        setText('fc-meaning', word.meaning);
        
        // Mẹo nhớ (Luôn hiển thị placeholder nếu không có để đỡ trống)
        const mnContainer = document.getElementById('mnemonic-container');
        if (mnContainer) {
             const mnText = (word.mnemonic && word.mnemonic.trim() !== '') 
                ? word.mnemonic 
                : "Tưởng tượng một hình ảnh vui nhộn liên quan đến từ này...";
             setText('fc-mnemonic', mnText);
             mnContainer.style.display = 'block';
        }
        
        setText('fc-en', word.example_en ? `"${word.example_en}"` : '');
        setText('fc-vi', word.example_vi || '');
        
        // Collocation (Ẩn nếu không có)
        const colloBox = document.getElementById('collo-box');
        if(colloBox) {
            if(word.collocation) {
                setText('fc-collocation', word.collocation);
                colloBox.style.display = 'block';
            } else {
                colloBox.style.display = 'none';
            }
        }
        
        // 3. PROGRESS BAR (Story Style)
        const pct = ((index + 1) / words.length) * 100; // Đầy cây khi học xong
        const bar = document.getElementById('player-bar');
        if(bar) bar.style.width = `${pct}%`;
        setText('player-progress', `${index + 1}/${words.length}`);

        // 4. RESET STATE
        const card = document.getElementById('active-card');
        if (card) {
            card.classList.remove('is-flipped');
            this.playerState.isFlipped = false;
        }

        // 5. AUTO PLAY
        if (this.playerState.autoPlay) {
            this.playAudio();
            setTimeout(() => {
                if(!this.playerState.isFlipped) this.flipCard();
            }, 2000);
        }
    },

    flipCard() {
        const card = document.getElementById('active-card');
        this.playerState.isFlipped = !this.playerState.isFlipped;
        card.classList.toggle('is-flipped', this.playerState.isFlipped);
    },

    // PATCH_v2
    // PATCH_v2
    handleRating(type) {
        const card = document.getElementById('active-card');
        const direction = type === 'remember' ? 'translateX(50px)' : 'translateX(-50px)';
        
        // 1. SAVE SRS PROGRESS
        const currentWord = this.playerState.words[this.playerState.index];
        if (currentWord) {
            Storage.updateVocabSRS(currentWord.word, type);
        }

        // 2. Animation
        card.style.transform = `${direction} rotateY(${this.playerState.isFlipped ? 180 : 0}deg)`;
        card.style.opacity = '0.5';

        setTimeout(() => {
            if (this.playerState.index < this.playerState.words.length - 1) {
                this.playerState.index++;
                card.style.transition = 'none';
                card.style.transform = ''; 
                card.style.opacity = '1';
                void card.offsetWidth; 
                card.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                this.renderCard();
            } else {
                // 3. FINISH & SYNC DAILY PLAN
                const tasks = JSON.parse(localStorage.getItem('daily_tasks')) || {};
                if (!tasks.vocab) {
                    tasks.vocab = true;
                    localStorage.setItem('daily_tasks', JSON.stringify(tasks));
                }

                alert("🎉 Hoàn thành bài học! Dữ liệu trí nhớ đã được cập nhật.");
                this.switchView('dashboard');
                this.renderDashboard(); // Re-render để update stats
                
                card.style.transform = '';
                card.style.opacity = '1';
            }
        }, 300);
    },

    // Chức năng ôn tập từ đến hạn
    startReviewSession() {
        const dueWords = Storage.getDueWords();
        if (dueWords.length === 0) return alert("Bạn đã ôn hết từ hôm nay rồi! 👏");
        
        // Shuffle (Trộn ngẫu nhiên)
        const sessionWords = dueWords.sort(() => 0.5 - Math.random()).slice(0, 20); // Max 20 từ/lần
        
        this.startPlayer({
            title: "Review Session 🧠",
            words: sessionWords
        });
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