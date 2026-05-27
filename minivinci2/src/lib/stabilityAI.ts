import { extractImageParams } from "./claudeAI";

export async function generateImage(storyText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_STABILITY_API_KEY;
  if (!apiKey) throw new Error("Add VITE_STABILITY_API_KEY to your .env file");

  const p = await extractImageParams(storyText);

  const prompt = [
    "A flat lay photograph of an open minimalist children's board book spread.",
    `The left page is a solid ${p.primaryAccent} background with a darker watercolor wash texture.`,
    `On the left, a small graphic silhouette of three ${p.subjectPlural} walks.`,
    `On the right, textured cream paper with large watercolor wash of a ${p.secondaryAccent} ${p.secondarySubject}.`,
    `Next to the wash, a large, detailed black ink outline drawing of a ${p.subjectSingular}'s head.`,
    "Subtle parallel lines connect the two pages.",
    `Text in a clean sans-serif font: Left: '${p.caption1}', Right: '${p.caption2}'.`,
    "A small physical die-cut hole is on the left page. Visible paper texture.",
  ].join(" ");

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("negative_prompt", "3d render, detailed, intricate, excessive detail, high saturation, photorealistic fur, cartoonish");
  formData.append("aspect_ratio", "16:9");
  formData.append("seed", "42");
  formData.append("output_format", "webp");

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
  return `data:image/webp;base64,${data.image}`;
}
