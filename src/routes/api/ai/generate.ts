import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt } = (await request.json()) as { prompt: string };
        const LOVABLE_AI_URL = "https://ai-gateway.lovable.dev/api/chat/completions";
        const res = await fetch(LOVABLE_AI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LOVABLE_API_KEY}` },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], max_tokens: 2000 }),
        });
        const data = await res.json() as any;
        const text = data.choices?.[0]?.message?.content || "";
        return new Response(JSON.stringify({ text }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});