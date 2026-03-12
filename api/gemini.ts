import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const { action, payload } = req.body;

    if (action === 'generateScenario' || action === 'evaluateResponse' || action === 'getQuestionSuggestion') {
      const response = await ai.models.generateContent(payload);
      return res.status(200).json({ text: response.text });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
