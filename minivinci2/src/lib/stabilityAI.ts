import { extractImageParams } from "./claudeAI";

export async function generateStamp(subject: string): Promise<string> {
  const apiKey = import.meta.env.VITE_STABILITY_API_KEY;
  if (!apiKey) throw new Error("Add VITE_STABILITY_API_KEY to your .env file");

  const formData = new FormData();
  formData.append("prompt", `Minimalist children's book stamp illustration of a ${subject}. Single centered subject, flat watercolor style, soft pastel colors, bold black ink outline, cute and simple, plain white background, no text, no background details, square composition.`);
  formData.append("negative_prompt", "complex background, scenery, text, words, photo, realistic, multiple subjects, dark, border, frame, collage");
  formData.append("aspect_ratio", "1:1");
  formData.append("output_format", "webp");

  const response = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/core",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
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

export async function generateImage(storyText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_STABILITY_API_KEY;
  if (!apiKey) throw new Error("Add VITE_STABILITY_API_KEY to your .env file");

  const p = await extractImageParams(storyText);

  const prompt = [
    "A minimalist children's book illustration, single page, flat graphic style.",
    `Solid ${p.primaryAccent} background with subtle watercolor wash texture.`,
    `A large watercolor wash of ${p.secondaryAccent} fills the center, depicting a ${p.secondarySubject}.`,
    `A bold black ink outline illustration of a ${p.subjectSingular} in the foreground.`,
    `Small graphic silhouettes of three ${p.subjectPlural} along the bottom edge.`,
    `Text in a clean sans-serif font: '${p.caption1}' and '${p.caption2}'.`,
    "Visible paper texture. No book, no frame, no border, no photograph.",
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
