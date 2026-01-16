// PATCH_revert
import { Storage } from './storage.js';
// Cấu hình API
const API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Hàm gọi OpenAI API
 * @param {string} prompt - Câu hỏi gửi lên
 * @param {string} systemRole - Vai trò của AI
 */
// PATCH_v2
// PATCH_v2
// PATCH_v2
export async function askAI(prompt, systemRole = "You are a helpful English tutor.", returnJson = false) {
    // ⚠️ QUAN TRỌNG: Thay dòng dưới bằng Link Cloudflare Worker của bạn
    const CLOUDFLARE_WORKER_URL = "https://openai-proxy.trantien.workers.dev"; 
    
    const personalKey = Storage.getApiKey();
    const usePersonalKey = personalKey && personalKey.trim() !== '';
    const endpoint = usePersonalKey ? API_URL : CLOUDFLARE_WORKER_URL;
    
    if (!usePersonalKey && endpoint.includes("YOUR_NAME")) {
         throw new Error("⚠️ Vui lòng setup Cloudflare Worker hoặc nhập API Key vào Settings!");
    }

    try {
        const headers = { "Content-Type": "application/json" };
        if (usePersonalKey) headers["Authorization"] = `Bearer ${personalKey}`;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemRole },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7 // Sáng tạo vừa đủ
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Lỗi kết nối (${response.status})`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Auto-Clean JSON Logic
        if (returnJson) {
            try {
                content = content.replace(/```json|```/g, '').trim();
                const start = content.indexOf('{');
                const end = content.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    content = content.substring(start, end + 1);
                }
                return JSON.parse(content);
            } catch (e) {
                console.warn("AI JSON Parse Warning:", e);
                // Fallback: trả về text gốc nếu parse lỗi để debug
                throw new Error("AI không trả về đúng định dạng JSON.");
            }
        }

        return content;
    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}
