// parseWithOpenRouter.ts
export interface ParsedData {
  tank: string | null;
  material: string | null;
  tinggi: number | null;
}

export async function parseWithOpenRouter(text: string): Promise<ParsedData | null> {
  const prompt = `Ekstrak informasi berikut menjadi JSON dengan properti "tank", "material", dan "tinggi" (angka cm).
Contoh output: {"tank":"OTG1","material":"oli engine","tinggi":110.5}

Input: ${text}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, // simpan di .env
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // atau model lain
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content) as ParsedData;
  } catch (err) {
    console.error("OpenRouter error:", err);
    return null;
  }
}
