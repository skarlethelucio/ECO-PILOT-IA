const express = require("express");
const path = require("path");
require('dotenv').config();
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const BACKBOARD_API_KEY = process.env.BACKBOARD_API_KEY;
const BASE_URL = "https://app.backboard.io/api";

let assistant_id = null;
let thread_id = null;

const MAX_KWH = 52; // batería total

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/analyze", async (req, res) => {
  const { speed, battery, distance } = req.body;

  try {
    const { default: fetch } = await import("node-fetch");

    // =========================
    // 🛑 VALIDACIONES PRO
    // =========================

    const v = parseFloat(speed);
    const kwh = parseFloat(battery);
    const dist = parseFloat(distance);

    if (!v || !kwh || !dist || dist <= 0) {
      return res.json({
        result: "Invalid input: check speed, battery, and distance",
        efficiency: 0
      });
    }

    // =========================
    // 🌦️ WEATHER
    // =========================

    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Indianapolis&appid=${WEATHER_API_KEY}&units=metric`
    );
    const weatherData = await weatherRes.json();

    const temp = weatherData.main?.temp ?? 20;
    const wind = weatherData.wind?.speed ?? 0;

    // =========================
    // 🧠 MODELO FÍSICO CORRECTO
    // =========================

    // ✔️ eficiencia base (kWh/km)
    let baseEfficiency = kwh / dist;

    // ✔️ drag aerodinámico (ajustado)
    let aeroFactor = 1 + (v * v * 0.00002);

    // ✔️ clima
    let weatherFactor = 1.0;
    if (temp < 15) weatherFactor += 0.10;
    if (temp > 30) weatherFactor += 0.08;
    if (wind > 5) weatherFactor += (wind * 0.015);

    let realEfficiency = baseEfficiency * aeroFactor * weatherFactor;

    // ✔️ batería %
    let batteryPct = ((kwh / MAX_KWH) * 100).toFixed(1);

    console.log("Eficiencia:", realEfficiency.toFixed(4), "kWh/km");
    console.log("Battery %:", batteryPct);

    // =========================
    // 🤖 BACKBOARD AI
    // =========================

    if (!assistant_id) {
      const assistantRes = await fetch(`${BASE_URL}/assistants`, {
        method: "POST",
        headers: {
          "X-API-Key": BACKBOARD_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "EcoPilot AI",
          system_prompt: `
You are a strict Formula E race engineer.

Respond EXACTLY in this format:

Analysis: one sentence using efficiency and battery %, and indicate if the scenario is unrealistic
Driver Tip: one action based on speed
Race Optimization: one improvement based on energy usage

No extra text.
`
        })
      });

      const assistantData = await assistantRes.json();
      assistant_id = assistantData.assistant_id;
    }

    if (!thread_id) {
      const threadRes = await fetch(`${BASE_URL}/assistants/${assistant_id}/threads`, {
        method: "POST",
        headers: {
          "X-API-Key": BACKBOARD_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      const threadData = await threadRes.json();
      thread_id = threadData.thread_id;
    }

    // =========================
    // 💬 MENSAJE AI
    // =========================

    const messageRes = await fetch(`${BASE_URL}/threads/${thread_id}/messages`, {
      method: "POST",
      headers: {
        "X-API-Key": BACKBOARD_API_KEY
      },
      body: new URLSearchParams({
        content: `
Speed: ${v} km/h
Distance: ${dist} km
Battery Used: ${kwh} kWh (${batteryPct}%)
Efficiency: ${realEfficiency.toFixed(4)} kWh/km
Temperature: ${temp} C
Wind: ${wind} m/s
`,
        stream: "false"
      })
    });

    const messageData = await messageRes.json();

    console.log("AI:", messageData);

    res.json({
      result: messageData.content || "No response",
      efficiency: parseFloat(realEfficiency.toFixed(4))
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.json({ result: "Error: " + error.message });
  }
});

app.listen(3000, () => console.log("🚀 http://localhost:3000"));