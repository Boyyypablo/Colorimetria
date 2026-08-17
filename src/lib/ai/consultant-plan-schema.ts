import { z } from "zod";

export const TRAIT_ACTIONS = ["suavizar", "exaltar", "manter"] as const;
export const CHANGE_AREAS = [
  "olhar",
  "olheiras",
  "sobrancelha",
  "labios",
  "pele",
  "cabelo",
  "roupa",
  "batom",
  "sombra",
  "base",
  "acessorio",
  "outro",
] as const;

export const consultantPrioritySchema = z.object({
  trait: z.string().min(1).max(80),
  action: z.enum(TRAIT_ACTIONS),
  why: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
});

export const consultantChangeSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/i)
    .describe("id estável para feedback, ex: olhar-1"),
  area: z.enum(CHANGE_AREAS),
  suggestion: z.string().min(1).max(500),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(6).default([]),
  do: z.string().min(1).max(300),
  dont: z.string().min(1).max(300),
});

export const consultantPlanSchema = z.object({
  assessment: z.string().min(1).max(800),
  priorities: z.array(consultantPrioritySchema).min(1).max(6),
  changes: z.array(consultantChangeSchema).min(1).max(8),
  seasonAlignment: z.string().min(1).max(500),
  needsHumanReview: z.boolean(),
});

export type ConsultantPlan = z.infer<typeof consultantPlanSchema>;
export type ConsultantChange = z.infer<typeof consultantChangeSchema>;
export type ConsultantPriority = z.infer<typeof consultantPrioritySchema>;

export type ConsultantPlanMeta = {
  status: "ok" | "skipped" | "error";
  model?: string;
  usedVision?: boolean;
  error?: string;
  generatedAt?: string;
  provider?: "none" | "ollama" | "gemini" | "cards";
  cardIds?: string[];
  rubricVersion?: string;
};

/** Target canônico de feedback para uma mudança da IA. */
export function consultantChangeTarget(changeId: string): string {
  return `ai_change:${changeId}`;
}
