// ------------------------------
// Smart Watering AI Backend
// ------------------------------
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());                    // 🔥 Allows dashboard to call backend
app.use(express.json());

// 🔥 Load your ShroomBot / DeepSeek key
const API_KEY = process.env.DEEPSEEK_KEY;

if (!API_KEY) {
  console.warn("⚠️ WARNING: No DEEPSEEK_KEY found in environment variables!");
} else {
  console.log("✅ API Key loaded.");
}

// ------------------------------
// AI Analysis Endpoint
// ------------------------------
app.post("/api/analyze", async (req, res) => {
  try {
    const payload = req.body;

    console.log("📥 AI request received.");
    console.log("Payload:", payload);

    // Compose the prompt for DeepSeek / ShroomBot
    const prompt = `
You are the anomaly-detection AI for a smart watering system.
Analyze:

Current reading:
${JSON.stringify(payload.current, null, 2)}

Weekly summary:
${JSON.stringify(payload.weekly_summary, null, 2)}

Local detection:
${JSON.stringify(payload.local_detection, null, 2)}

Return:
{
  "severity": "low|medium|high|critical",
  "analysis": "short explanation",
  "notes": ["factor1", "factor2"]
}
    `;

    // ------------------------------
    // 🔥 Send request to ShroomBot
    // ------------------------------
    const aiRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    });

    const data = await aiRes.json();

    console.log("📤 AI response:", data);

    // Fail-safe: if API fails
    if (!data || !data.choices) {
      return res.json({
        severity: "error",
        analysis: "AI backend returned invalid response.",
        notes: ["No usable data from model."]
      });
    }

    // Try parsing JSON from model
    let parsed = null;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      parsed = {
        severity: "medium",
        analysis: data.choices[0].message.content,
        notes: []
      };
    }

    return res.json(parsed);

  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ------------------------------
// Start Server
// ------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Analysis server running at http://localhost:${PORT}`);
});
