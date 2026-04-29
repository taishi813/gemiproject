export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { systemPrompt, history } = req.body;

    if (!systemPrompt || !history) {
      return res.status(400).json({
        error: "systemPrompt または history が不足しています"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY が設定されていません"
      });
    }

    // Gemini用に変換
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      ...history.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }))
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 500
          }
        })
      }
    );

    const data = await response.json();

    // APIエラー詳細表示
    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(500).json({
        error: data
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "（返答が取得できませんでした）";

    return res.status(200).json({ reply });

  } catch (e) {
    console.error("Server Error:", e);
    return res.status(500).json({
      error: e.message
    });
  }
}
