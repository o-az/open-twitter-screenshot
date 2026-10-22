import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const styleSchema = z.object({
  version: z.literal(1).default(1),
  avatar: z.boolean().default(true),
  displayName: z.boolean().default(true),
  handle: z.boolean().default(true),
  verified: z.boolean().default(true),
  timestamp: z.enum(["relative", "date", "datetime", "hidden"]).default("date"),
  media: z.boolean().default(true),
  quote: z.boolean().default(true),
  reply: z.boolean().default(true),
  thread: z.boolean().default(false),
  note: z.boolean().default(true),
  linkCard: z.boolean().default(true),
  replies: z.boolean().default(true),
  reposts: z.boolean().default(true),
  likes: z.boolean().default(true),
  bookmarks: z.boolean().default(true),
  views: z.boolean().default(true),
  metricStyle: z.enum(["icons", "numbers", "compact"]).default("compact"),
  theme: z.enum(["light", "dim", "dark", "custom"]).default("light"),
  cardColor: color.default("#ffffff"),
  textColor: color.default("#18181b"),
  secondaryColor: color.default("#71717a"),
  accentColor: color.default("#2584df"),
  font: z.enum(["system", "inter", "geist", "serif", "mono"]).default("inter"),
  fontSize: z.number().int().min(14).max(36).default(22),
  cardWidth: z.number().int().min(320).max(800).default(520),
  padding: z.number().int().min(16).max(64).default(32),
  radius: z.number().int().min(0).max(48).default(16),
  shadow: z.enum(["none", "soft", "strong", "glow"]).default("soft"),
  glass: z.boolean().default(false),
  border: z.boolean().default(false),
  borderWidth: z.number().int().min(1).max(8).default(1),
  borderColor: color.default("#d4d4d8"),
  borderStyle: z.enum(["solid", "dashed", "gradient"]).default("solid"),
  background: z
    .enum(["gradient", "solid", "mesh", "transparent", "image"])
    .default("gradient"),
  backgroundColor: color.default("#e8e4de"),
  gradient: z.number().int().min(0).max(19).default(0),
  customGradient: z.boolean().default(false),
  stop1: color.default("#c7b8f5"),
  stop2: color.default("#f3b8d0"),
  stop3: color.default("#ffab8f"),
  threeStops: z.boolean().default(true),
  angle: z.number().int().min(0).max(360).default(135),
  mesh: z.number().int().min(0).max(3).default(0),
  grain: z.boolean().default(false),
  // Uploads are small, raster-only data URLs so shared looks are self-contained.
  image: z
    .string()
    .max(160000)
    .regex(/^$|^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .default(""),
  backgroundPadding: z.number().int().min(0).max(180).default(80),
  ratio: z.enum(["auto", "1:1", "4:5", "16:9", "9:16", "3:2"]).default("auto"),
  format: z.enum(["png", "jpeg", "webp", "svg"]).default("png"),
  scale: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .default(2),
  quality: z.number().int().min(40).max(100).default(95),
});

export type StyleState = z.infer<typeof styleSchema>;
export const defaultStyle: StyleState = styleSchema.parse({});
export type UpdateStyle = <K extends keyof StyleState>(
  key: K,
  value: StyleState[K],
) => void;

export const fonts: Record<StyleState["font"], string> = {
  system: "Arial, sans-serif",
  inter: "var(--font-inter), Arial, sans-serif",
  geist: "var(--font-geist), Arial, sans-serif",
  serif: "var(--font-serif), Georgia, serif",
  mono: "var(--font-mono), monospace",
};

export const themes = {
  light: {
    cardColor: "#ffffff",
    textColor: "#18181b",
    secondaryColor: "#71717a",
    accentColor: "#2584df",
  },
  dim: {
    cardColor: "#15202b",
    textColor: "#f7f9f9",
    secondaryColor: "#a3afba",
    accentColor: "#6bbafa",
  },
  dark: {
    cardColor: "#080808",
    textColor: "#f5f5f5",
    secondaryColor: "#9a9a9f",
    accentColor: "#6bbafa",
  },
} as const;
