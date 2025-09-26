import { GoogleGenAI } from "@google/genai";

/**
 * ===================================================================================
 * --- CRITICAL SECURITY AND IMPLEMENTATION WARNING ---
 * ===================================================================================
 *
 * This file now contains the REAL code to call the Gemini API.
 *
 * 1.  DO NOT USE THIS CODE ON THE CLIENT SIDE. This code is meant to be deployed in a
 *     secure server environment (e.g., a Supabase Edge Function, Next.js API Route,
 *     Google Cloud Function, etc.).
 *
 * 2.  YOUR API KEY MUST BE A SERVER-SIDE ENVIRONMENT VARIABLE. The line
 *     `apiKey: process.env.API_KEY` is how you securely access your key on a server.
 *     You would set this environment variable in your cloud provider's dashboard,
 *     NOT in the code itself.
 *
 * 3.  THIS WILL NOT WORK "OUT OF THE BOX" IN THIS CLIENT-ONLY APP. When you run this,
 *     it will fail because `process.env.API_KEY` is undefined in the browser. This is
 *     the INTENDED and SAFE behavior. It prevents your key from leaking.
 *
 * To make this work, you would:
 *    a. Create a new backend endpoint (e.g., in Supabase: Database -> Functions -> Create a new function).
 *    b. Copy this entire `generateSummary` function into that new server function.
 *    c. Set your Gemini API key as a secret environment variable for that function.
 *    d. In the frontend Editor component, change the `handleSummarize` function to `fetch` your new backend
 *       endpoint instead of calling this function directly.
 *
 * ===================================================================================
 */

export const generateSummary = async (content: string): Promise<string> => {
  try {
    // IMPORTANT: The API key is read from server-side environment variables.
    // Replace 'process.env.API_KEY' with your actual key only in a secure, non-public backend environment.
    // The key you provided was: 'AIzaSyAY6k2DUJdoaq5tEOcHt0LiSJP5Yk5CQkw'
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    if (!content) {
      throw new Error('Content is required to generate a summary.');
    }

    if (content.length < 50) {
        return "Content is too short to generate a meaningful summary.";
    }

    const prompt = `Summarize the following blog post content in a concise paragraph (around 50-70 words). Capture the main idea and key takeaways. Here is the content:\n\n---\n\n${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const summary = response.text;
    
    if (!summary) {
        throw new Error('The AI did not return a summary.');
    }
    
    return summary;

  } catch (error) {
    console.error("Error generating summary with Gemini API:", error);
    // Provide a user-friendly error message
    return 'There was an error generating the AI summary. Please try again later.';
  }
};
