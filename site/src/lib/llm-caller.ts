/**
 * Call LLMs to collect mention data
 */

interface LLMResponse {
  model: string;
  query: string;
  response: string;
  mentioned_brands: string[];
}

export async function callClaude(query: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function callGPT4(query: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT-4 API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function callGemini(query: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: query,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function callLlama(query: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Llama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function extractMentions(
  response: string,
  brands: string[]
): Promise<string[]> {
  /**
   * Extract brand mentions from LLM response
   * Simple case-insensitive search
   */
  const mentions: string[] = [];
  const responseLower = response.toLowerCase();

  for (const brand of brands) {
    if (responseLower.includes(brand.toLowerCase())) {
      mentions.push(brand);
    }
  }

  return mentions;
}

export async function callAllLLMs(query: string): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  try {
    results["claude-3.5-sonnet"] = await callClaude(query);
  } catch (e) {
    console.error("Claude error:", e);
    results["claude-3.5-sonnet"] = "";
  }

  try {
    results["gpt-4"] = await callGPT4(query);
  } catch (e) {
    console.error("GPT-4 error:", e);
    results["gpt-4"] = "";
  }

  try {
    results["gemini"] = await callGemini(query);
  } catch (e) {
    console.error("Gemini error:", e);
    results["gemini"] = "";
  }

  // Skip Llama/Groq for now
  // try {
  //   results["llama"] = await callLlama(query);
  // } catch (e) {
  //   console.error("Llama error:", e);
  //   results["llama"] = "";
  // }

  return results;
}
