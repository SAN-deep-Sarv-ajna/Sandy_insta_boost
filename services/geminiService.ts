import { GoogleGenAI } from "@google/genai";

export const getMarketingAdvice = async (query: string, platform: string): Promise<string> => {
  // Fix: Initialize GoogleGenAI with process.env.API_KEY directly as per guidelines.
  // We assume the API key is pre-configured and valid.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `
      You are an expert Social Media Marketing consultant for an Indian SMM Panel.
      The user is asking for advice regarding: "${query}" on the platform: "${platform}".
      Provide a concise, strategic, and actionable tip (max 100 words) tailored to the Indian digital landscape.
      Focus on growth in India (e.g. Reels trends, festival timing, regional content) and organic growth synergy with paid services.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No advice available at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to fetch marketing advice. Please try again later.";
  }
};