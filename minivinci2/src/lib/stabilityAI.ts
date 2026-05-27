export async function generateImage(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_STABILITY_API_KEY;
  if (!apiKey) throw new Error("Add VITE_STABILITY_API_KEY to your .env file");

  const formData = new FormData();
  formData.append("prompt", `Children's storybook illustration, colorful and whimsical: ${prompt}`);
  formData.append("output_format", "png");
  formData.append("aspect_ratio", "4:3");

  const response = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/core",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Stability AI error: ${response.status}`);
  }

  const data = await response.json();
  return `data:image/png;base64,${data.image}`;
}
