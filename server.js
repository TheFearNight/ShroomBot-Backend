import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// Use environment variable for API key
const API_KEY = process.env.DEEPSEEK_KEY;

app.post("/api/analyze", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      severity: "ERROR",
      summary: "Missing DeepSeek API key",
      details: "No DEEPSEEK_KEY found in environment variables."
    });
  }

  const { current, weekly_summary, local_detection } = req.body;

  const prompt = `
You are an anomaly-detection AI for a smart watering system.

Current:
- Moisture: ${current.moisture_pct}%
- Temp: ${current.temperature_c}°C
- Weather: ${current.weather_condition}
- Rain: ${current.weather_rain_mm} mm
- Wind Speed: ${current.weather_wind_speed} m/s

Weekly:
- Avg Moisture: ${weekly_summary?.avgMoisture}
- Trend: ${weekly_summary?.trend}

Local Detection:
- Severity: ${local_detection?.severity}
- Score: ${local_detection?.score}

Return a JSON with keys:
{
  "severity": "OK|WARNING|CRITICAL|ERROR",
  "analysis": "...",
  "notes": ["..."]
}
  `;

  try {
    const aiRes = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      },
      {
        headers: { Authorization: `Bearer ${API_KEY}` }
      }
    );

    let text = aiRes.data.choices?.[0]?.message?.content?.trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        severity: "ERROR",
        analysis: text,
        notes: []
      };
    }

    return res.json(parsed);

  } catch (err) {
    console.error("AI error:", err.message);
    return res.status(500).json({
      severity: "ERROR",
      analysis: "AI backend error",
      notes: [err.message],
    });
  }
});

// Basic route
app.get("/", (req, res) => {
  res.send("🌱 ShroomBot Backend is alive!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on ${PORT}`));
