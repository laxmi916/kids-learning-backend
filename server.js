import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// ✅ Allow cross-origin requests
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(cors());
app.use(express.json());

// ✅ Use API key from environment (never hardcode)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Root endpoint
app.get("/", (req, res) => {
  res.send("🚀 Backend is running! Use /story, /quiz, /words, or /translate.");
});

let story = "";  // global variable

// 📖 Story endpoint
app.post("/story", async (req, res) => {
  const { age, topic } = req.body;
  const promptText = `Write a short fun English story (max 250 words) for a ${age}-year-old child about ${topic}. Use simple words for Indian kids, use Indian names. devide story into paragraphs, donot use * inside story`;

  try {
    const result = await model.generateContent(promptText);
    story = result.response.text();   // store in global variable
    res.json({ story });
  } catch (err) {
    console.error("❌ Story error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Utility function to clean AI output
function cleanText(text) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

// ❓ Quiz endpoint
let quizzes = {}; // store quizzes temporarily

// 📖 Quiz endpoint (fixed)
app.post("/quiz", async (req, res) => {
  const { story } = req.body;

  const promptText = `
  Based on this story:
  "${story}"

  Create 5 multiple-choice quiz questions for kids.
  Each question must have exactly 4 options (A, B, C, D).
  Clearly mark the correct answer.

  Format the output as strict JSON like this:
  {
    "questions": [
      {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "Correct Option"
      }
    ]
  }
  `;

  try {
    const result = await model.generateContent(promptText);
    let text = result.response.text().replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(text);

    const quizId = Date.now().toString();

    // Normalize keys to always include lowercase "answer"
    const normalizedQuestions = parsed.questions.map((q) => ({
      question: q.question,
      options: q.options,
      answer: q.answer || q.Answer || q.correct || q.Correct || q.options[0], // fallback first option
    }));

    quizzes[quizId] = normalizedQuestions; // save with answers

    res.json({
      quizId,
      questions: normalizedQuestions,
    });
  } catch (err) {
    console.error("❌ Quiz error:", err);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});


// ✍️ Words endpoint
app.post("/words", async (req, res) => {
  const { age } = req.body;
  const prompt = `Pretend you are a ${age}-year-old indian child. Describe your daily routine in your own words (max 200 words), step by step, from morning to night. use indian food, use games like criket, football, played with toys, not gilli ganda like old games, assume cristian kid, moder culture. do not use *`;

  try {
    const result = await model.generateContent(prompt);
    res.json({ words: result.response.text() });
  } catch (err) {
    console.error("❌ Words error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🌍 Translate endpoint
app.post("/translate", async (req, res) => {
  const { text } = req.body;
  const prompt = `Translate the following text into Telugu. 
  Keep meaning same and use simple words for kids:\n\n${text}`;

  try {
    const result = await model.generateContent(prompt);
    const translated = await result.response.text(); // <-- await added
    //const translated = result.response.text();
    res.json({ translated });
  } catch (err) {
    console.error("❌ Translation error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/math", async (req, res) => {
  const { age, operation } = req.body;

  const prompt = `
  Generate 5 ${operation} math problems for a ${age}-year-old child.
  Use only ${operation} type problems.
  Return ONLY valid JSON array in this format:
  [
    {"question": "5 + 3 =", "answer": 8},
    {"question": "10 + 2 =", "answer": 12}
  ]
  No text, no markdown, just JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const problems = JSON.parse(cleaned);

    res.json({ problems });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Failed to generate problems" });
  }
});

// ✅ Use dynamic port for hosting (Render/Railway)
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server running on http://0.0.0.0:${PORT}`));
