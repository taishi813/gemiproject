export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { systemPrompt, history } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

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

    async function fetchWithRetry(url, options, retries = 3) {
      for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);

        if (response.ok) return response;

        const data = await response.json();

        // 503だけリトライ
        if (response.status === 503) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }

        throw new Error(JSON.stringify(data));
      }

      throw new Error("Geminiが混雑中（リトライ失敗）");
    }

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 800
          }
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "（返答なし）";

    res.status(200).json({ reply });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
