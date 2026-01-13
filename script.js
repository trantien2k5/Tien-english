document.addEventListener('DOMContentLoaded', () => {
    // --- 1. KHAI BÁO BIẾN UI TẬP TRUNG ---
    const elements = {
        generateBtn: document.getElementById('generateBtn'),
        userInput: document.getElementById('userInput'),
        modeSelect: document.getElementById('modeSelect'),
        levelSelect: document.getElementById('levelSelect'),
        resultArea: document.getElementById('resultArea'),
        contentDisplay: document.getElementById('contentDisplay'),
        loader: document.getElementById('loader'),
        settingsBtn: document.getElementById('settingsBtn'),
        keyModal: document.getElementById('keyModal'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        saveKeyBtn: document.getElementById('saveKeyBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        navItems: document.querySelectorAll('.nav-item'),
        tabContents: document.querySelectorAll('.tab-content'),
        micBtn: document.getElementById('micBtn'),
        speechStatus: document.getElementById('speech-status'),
        chatBox: document.getElementById('chat-box')
    };

    let sessionKey = "";

    // --- 2. QUẢN LÝ API KEY ---
    const getApiKey = () => sessionKey || localStorage.getItem('GEMINI_KEY');

    elements.settingsBtn.onclick = () => {
        elements.apiKeyInput.value = getApiKey() || "";
        elements.keyModal.classList.remove('hidden');
    };

    elements.closeModalBtn.onclick = (e) => {
        e.preventDefault();
        elements.keyModal.classList.add('hidden');
    };

    elements.saveKeyBtn.onclick = () => {
        const key = elements.apiKeyInput.value.trim();
        if (key) {
            sessionKey = key;
            try { localStorage.setItem('OPENAI_KEY', key); } catch (e) { }
            alert("✅ Đã lưu Key!");
            elements.keyModal.classList.add('hidden');
        }
    };

    window.onclick = (e) => { if (e.target == elements.keyModal) elements.keyModal.classList.add('hidden'); };

    // --- 3. HỆ THỐNG TAB ---
    elements.navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabs = ['learn', 'speak', 'vocab', 'review', 'progress'];

            elements.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            elements.tabContents.forEach(content => content.classList.add('hidden'));

            const targetTab = document.getElementById(`tab-${tabs[index]}`);
            if (targetTab) targetTab.classList.remove('hidden');

            if (tabs[index] === 'vocab') renderSavedVocab();
            if (tabs[index] === 'review') initFlashcards();
            if (tabs[index] === 'progress') updateProgressTab();
        });
    });

    // --- 4. TẠO BÀI HỌC AI (TAB 1) ---
    elements.generateBtn.onclick = async () => {
        const key = getApiKey();
        if (!key) { alert("Vui lòng nhập API Key!"); elements.keyModal.classList.remove('hidden'); return; }
        if (!elements.userInput.value.trim()) { alert("Hãy nhập chủ đề!"); return; }

        elements.resultArea.classList.remove('hidden');
        elements.loader.classList.remove('hidden');
        elements.contentDisplay.innerHTML = "";

        try {
            const data = await callAI(key, elements.userInput.value, elements.modeSelect.value, elements.levelSelect.value);
            renderLesson(data);
        } catch (err) {
            elements.contentDisplay.innerHTML = `<p style="color:red; text-align:center;">Lỗi: ${err.message}</p>`;
        } finally {
            elements.loader.classList.add('hidden');
        }
    };

    // --- 5. LUYỆN NÓI AI (TAB 2) ---
    initSpeechRecognition(elements);

    // --- 6. KHO TỪ VỰNG (TAB 3) ---
    // Thay thế hàm saveToLibrary để hỗ trợ cá nhân hóa lâu dài
    window.saveToLibrary = (word, meaning) => {
    let library = JSON.parse(localStorage.getItem('MY_VOCAB') || '[]');
    if (!library.some(item => item.w === word)) {
        library.unshift({ 
            w: word, 
            m: meaning, 
            date: new Date().toISOString(),
            box: 1, // Hộp 1: Mới học -> Hộp 5: Đã thuộc lòng
            nextReview: Date.now() // Cần học ngay
        });
        localStorage.setItem('MY_VOCAB', JSON.stringify(library));
        showToast(`🚀 Đã thêm "${word}" vào lộ trình học!`);
        updateProgressTab(); 
    } else { 
        showToast("Từ này đã có trong danh sách.", "warning"); 
    }
};

    window.renderSavedVocab = () => {
        const display = document.getElementById('vocabListDisplay');
        const library = JSON.parse(localStorage.getItem('MY_VOCAB') || '[]');
        if (library.length === 0) {
            display.innerHTML = "<p style='text-align:center; color:gray; padding:40px;'>Kho từ trống...</p>";
            return;
        }
        display.innerHTML = library.map(item => `
            <div class="vocab-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:10px; background:#f8fafc; border-radius:10px;">
                <div><strong>${item.w}</strong><div style="font-size:0.85rem; color:#64748b;">${item.m}</div></div>
                <button onclick="speak('${item.w.replace(/'/g, "\\'")}')" class="icon-btn" style="background:none;">🔊</button>
            </div>
        `).join('');
    };

    window.clearAllVocab = () => { if (confirm("Xoá hết kho từ?")) { localStorage.removeItem('MY_VOCAB'); renderSavedVocab(); } };

});

// --- 7. CÁC HÀM TRỢ GIÚP ---

async function callAI(key, topic, mode, level) {
    const url = "https://api.openai.com/v1/chat/completions";
    const prompt = `Act as an English Teacher. Topic: "${topic}", Level: ${level}, Mode: ${mode}. 
    Output JSON ONLY: {"title":"","content":"","audioText":"","grammarPoint":"","vocab":[{"w":"","m":"","usage":""}],"quiz":{"q":"","o":[],"ai":0,"e":""}}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!res.ok) throw new Error("API Key OpenAI không hợp lệ hoặc hết hạn.");
    const json = await res.json();
    return JSON.parse(json.choices[0].message.content);
}

function renderLesson(data) {
    const display = document.getElementById('contentDisplay');
    display.innerHTML = `
        <div class="card shadow-lg">
            <div class="card-header">
                <h3>${data.title}</h3>
                <button onclick="speak('${data.audioText.replace(/'/g, "\\'")}')" class="btn-secondary">🔊 Listen</button>
            </div>
            <p style="font-size: 1.1rem; line-height: 1.8; margin-bottom:15px;">${data.content}</p>
            <div style="background:#fff7ed; padding:15px; border-left:5px solid #f97316; border-radius:8px; margin:20px 0;">
                <h4 style="color:#c2410c;">💡 Grammar Focus:</h4>
                <p style="font-size:0.95rem;">${data.grammarPoint || "Nâng cao cấu trúc câu"}</p>
            </div>
            <div style="background:#f0f7ff; padding:15px; border-radius:12px; margin-bottom:15px;">
                <h4 style="margin-bottom:10px;">🔑 Smart Vocab:</h4>
                ${data.vocab.map(v => `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; border-bottom:1px solid #dbeafe; padding-bottom:5px;">
                        <span>
                            <b style="color:var(--primary);">${v.w}</b>: ${v.m}
                            <br><small style="color:#64748b; font-style:italic;">Usage: ${v.usage || "Cách dùng phổ biến"}</small>
                        </span>
                        <button onclick="saveToLibrary('${v.w.replace(/'/g, "\\'")}', '${v.m.replace(/'/g, "\\'")}')" class="btn-primary" style="padding:2px 10px; font-size:12px; width:auto;">+</button>
                    </div>
                `).join('')}
            </div>
            <div style="border-top:2px dashed #ccc; padding-top:15px;">
                <p><b>Challenge:</b> ${data.quiz.q}</p>
                ${data.quiz.o.map((o, i) => `<button class="quiz-btn" onclick="checkAnswer(this,${i},${data.quiz.ai},'${data.quiz.e.replace(/'/g, "\\'")}')">${o}</button>`).join('')}
                <div id="fb" style="margin-top:10px; display:none; padding:15px; border-radius:10px; font-size:0.9rem;"></div>
            </div>
        </div>`;
}

async function callAIForTalk(userInput) {
    const key = localStorage.getItem('OPENAI_KEY');
    const url = "https://api.openai.com/v1/chat/completions";
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `English friend chat (max 2 sentences). Correct grammar if needed: "${userInput}"` }]
        })
    });
    
    const json = await res.json();
    return json.choices[0].message.content;
}

function initSpeechRecognition(el) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { el.speechStatus.innerText = "Trình duyệt không hỗ trợ Mic."; return; }
    
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    let isStarted = false; // Biến cờ hiệu kiểm soát trạng thái

    el.micBtn.onmousedown = () => {
        if (!isStarted) {
            try {
                rec.start();
                isStarted = true;
                el.micBtn.classList.add('recording');
            } catch (e) { console.error("Mic error:", e); }
        }
    };

    el.micBtn.onmouseup = () => {
        if (isStarted) {
            rec.stop();
            isStarted = false;
            el.micBtn.classList.remove('recording');
        }
    };

    rec.onresult = async (e) => {
        const txt = e.results[0][0].transcript;
        addMsg("You", txt);
        try {
            const res = await callAIForTalk(txt);
            addMsg("AI", res);
            speak(res);
        } catch (err) { addMsg("System", "Lỗi AI."); }
    };
}

function addMsg(sender, text) {
    const chat = document.getElementById('chat-box');
    const isUser = sender === "You";
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isUser ? 'chat-user' : 'chat-ai'}`;
    msgDiv.innerHTML = `<strong>${isUser ? 'Bạn' : 'AI'}:</strong> ${text}`;

    // Xóa dòng placeholder nếu có
    if (chat.querySelector('p')) chat.querySelector('p').remove();

    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

let currentIdx = 0;
function initFlashcards() {
    const allVocab = JSON.parse(localStorage.getItem('MY_VOCAB') || '[]');
    const now = Date.now();
    
    // Lọc từ đến hạn ôn tập
    const reviewData = allVocab.filter(item => !item.nextReview || item.nextReview <= now);
    
    if (reviewData.length === 0) {
        document.getElementById('card-word').innerText = "🎉 Hoàn thành!";
        document.getElementById('card-meaning').innerText = "Bạn đã ôn hết từ cần thiết cho hôm nay.";
        return;
    }
    
    currentIdx = 0;
    showCard(reviewData, 0);

    // Gán sự kiện cho nút "Đã nhớ" (Nâng cấp từ nút Tiếp theo)
    document.getElementById('nextBtn').onclick = () => {
        handleReviewResult(reviewData[currentIdx], true);
        currentIdx++;
        if (currentIdx < reviewData.length) showCard(reviewData, currentIdx);
        else initFlashcards();
    };
}

function showCard(data, idx) {
    const inner = document.getElementById('flashcard-inner');
    inner.classList.remove('flipped');
    setTimeout(() => {
        document.getElementById('card-word').innerText = data[idx].w;
        document.getElementById('card-meaning').innerText = data[idx].m;
        document.getElementById('card-counter').innerText = `${idx + 1}/${data.length}`;
        speak(data[idx].w);
    }, 150);
}

function updateProgressTab() {
    const library = JSON.parse(localStorage.getItem('MY_VOCAB') || '[]');
    const stats = JSON.parse(localStorage.getItem('USER_STATS') || '{"xp":0, "level":1}');
    
    // Cập nhật số từ
    document.getElementById('stat-vocab-count').innerText = library.length;
    
    // Cập nhật XP và Level
    document.getElementById('display-level').innerText = stats.level;
    const xpNeeded = stats.level * 100;
    const xpPct = (stats.xp % xpNeeded) / xpNeeded * 100;
    document.getElementById('xp-bar').style.width = xpPct + "%";
    
    // Danh hiệu dựa trên cấp độ
    const ranks = ["Tập sự", "Cần cù", "Thông thái", "Bậc thầy", "Huyền thoại"];
    document.getElementById('display-rank').innerText = ranks[Math.min(Math.floor(stats.level/5), 4)];
}

function handleReviewResult(wordObj, isRemembered) {
    let library = JSON.parse(localStorage.getItem('MY_VOCAB') || '[]');
    const index = library.findIndex(i => i.w === wordObj.w);
    
    if (index !== -1) {
        if (isRemembered) {
            library[index].box = Math.min(library[index].box + 1, 5);
        } else {
            library[index].box = 1; // Quên thì về hộp 1
        }
        
        // Công thức tính thời gian: Hộp 1: 1 ngày, Hộp 2: 3 ngày, Hộp 3: 7 ngày, Hộp 4: 15 ngày...
        const intervals = [0, 1, 3, 7, 15, 30]; 
        const nextDays = intervals[library[index].box];
        library[index].nextReview = Date.now() + (nextDays * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('MY_VOCAB', JSON.stringify(library));
        addXP(10); // Tặng 10 XP khi ôn tập
    }
}

// 4. Hệ thống XP (Gamification)
function addXP(amount) {
    let stats = JSON.parse(localStorage.getItem('USER_STATS') || '{"xp":0, "level":1}');
    stats.xp += amount;
    if (stats.xp >= stats.level * 100) {
        stats.level++;
        showToast(`🎊 Chúc mừng! Bạn đã lên cấp ${stats.level}!`, "success");
    }
    localStorage.setItem('USER_STATS', JSON.stringify(stats));
    updateProgressTab();
}

window.speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Tốc độ chậm hơn một chút để dễ nghe

    utterance.onstart = () => {
        showToast("Đang phát âm thanh...", "success");
    };

    window.speechSynthesis.speak(utterance);
};