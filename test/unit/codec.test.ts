import { describe, expect, it } from "vitest";
import { decodeStyle, encodeStyle } from "@/lib/style/codec";
import { defaultStyle, styleSchema } from "@/lib/style/schema";
import { looks } from "@/lib/style/presets";

describe("shareable style", () => {
  it("round-trips defaults, every look, and an asymmetric custom configuration", () => {
    for (const style of [
      defaultStyle,
      ...looks.map((look) => look.style),
      {
        ...defaultStyle,
        cardWidth: 637,
        padding: 43,
        radius: 7,
        angle: 217,
        threeStops: false,
        avatar: false,
        ratio: "9:16" as const,
        scale: 3 as const,
      },
    ]) {
      expect(decodeStyle(encodeStyle(style))).toEqual(style);
    }
    expect(encodeStyle(defaultStyle).length).toBeLessThan(10);
  });
  it("rejects corrupt, unsafe, unknown-version and out-of-range state", () => {
    for (const value of [
      "!",
      "",
      "a".repeat(220001),
      btoa('{"version":2}'),
      btoa('{"cardWidth":-1}'),
      btoa('{"image":"https://evil.test"}'),
      btoa('{"cardColor":"url(javascript:bad)"}'),
    ])
      expect(decodeStyle(value)).toBeNull();
    expect(styleSchema.safeParse({ scale: 8 }).success).toBe(false);
  });
});
