export async function generateStory(
  setting: string,
  characters: string[],
  genre: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Add VITE_ANTHROPIC_API_KEY to your .env file");

  const prompt = `Write a short, fun children's story (3–4 paragraphs) for ages 4–8.
Setting: ${setting}
Characters: ${characters.join(", ")}
Genre: ${genre}

Use the character names naturally throughout. Make it vivid, playful, age-appropriate, and end happily. Do not include a title or any headings — just the story paragraphs.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text as string;
  // Strip any leading markdown title line (e.g. "# Title\n\n")
  return text.replace(/^#.*\n+/, "").trim();
}
