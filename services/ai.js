// PATCH_v2
const API_URL = "/api/chat";

/**
 * Hàm gọi AI qua Cloudflare Pages Functions (không lộ API key)
 * @param {string} prompt - Câu hỏi gửi lên
 * @param {string} systemRole - Vai trò của AI
 */
export async function askAI(prompt, systemRole = "You are a helpful English tutor.") {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemRole }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || "Lỗi AI");
  }

  return data.choices?.[0]?.message?.content || "";
}
