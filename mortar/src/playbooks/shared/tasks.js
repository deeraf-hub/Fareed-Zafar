import { z } from "zod";
import { defineTask } from "../../models/task.js";
import { contextPack } from "../../models/context.js";
import { tokenize } from "../../knowledge/bm25.js";

/**
 * knowledge.answer — the one generative task shared by leasing and owner outreach.
 *
 * It is only used for questions the structured record can't answer (rent, pets,
 * availability, fees are answered by code from the listing / service record). The
 * model must answer from the retrieved text alone, and say when the text doesn't
 * contain the answer — then a person answers instead. A local model is enough.
 */
export const answerQuestion = defineTask({
  name: "knowledge.answer",
  why: "Long-tail questions (\"is there a fenced yard?\") answered strictly from retrieved documents; ungrounded → a person answers.",
  tiers: ["local", "frontier"],
  minConfidence: 0.6,
  maxOutputTokens: 200,
  schema: z.object({
    answer: z.string().describe("two sentences at most; empty when not grounded"),
    grounded: z.boolean().describe("true only if the reference text contains the answer"),
    sources: z.array(z.string()).describe("reference titles used"),
    confidence: z.number(),
  }),
  system: `Answer the question using ONLY the reference text. If the reference text does not contain the answer, set grounded to false and leave answer empty — never guess.
Keep answers to two sentences. Never describe a neighborhood's safety, character or residents, and never say who a home is "ideal for".`,
  prompt: ({ question, references }) =>
    contextPack(
      [
        { title: "Question", body: question, priority: 1, maxTokens: 120 },
        { title: "Reference text", body: references.map((r) => `[${r.title}] ${r.text}`).join("\n\n"), priority: 1, maxTokens: 520 },
      ],
      { budgetTokens: 700 }
    ).text,
  simulate: ({ question, references }) => {
    // Heuristic stand-in: pick the reference sentence sharing the most terms with the question.
    const q = new Set(tokenize(question));
    let best = { overlap: 0, sentence: "", source: "" };
    for (const ref of references) {
      for (const sentence of ref.text.split(/(?<=[.!?])\s+/)) {
        const overlap = tokenize(sentence).filter((t) => t.length >= 3 && q.has(t)).length;
        if (overlap > best.overlap) best = { overlap, sentence, source: ref.title };
      }
    }
    const grounded = best.overlap >= 1;
    const yesNo = /^(is|are|does|do|can|has|have)\b/i.test(String(question).trim());
    const answer = grounded ? `${yesNo ? "Yes — " : ""}${yesNo ? best.sentence.charAt(0).toLowerCase() + best.sentence.slice(1) : best.sentence}` : "";
    return { answer, grounded, sources: grounded ? [best.source] : [], confidence: grounded ? 0.75 : 0.7 };
  },
});

export const sharedTasks = [answerQuestion];
