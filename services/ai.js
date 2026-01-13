// Cấu hình API
const API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Hàm gọi OpenAI API
 * @param {string} prompt - Câu hỏi gửi lên
 * @param {string} systemRole - Vai trò của AI
 */
export async function askAI(prompt, systemRole = "You are a helpful English tutor.") {
    const apiKey = localStorage.getItem('openai_key');
    
    if (!apiKey) {
        throw new Error("Vui lòng nhập API Key trong phần Settings!");
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemRole },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Lỗi kết nối OpenAI");
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}