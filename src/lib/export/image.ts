import type { StyleState } from "@/lib/style/schema";
import type { Post } from "@/lib/tweet/types";

export async function exportImage(
  node: HTMLElement,
  style: StyleState,
  format = style.format,
): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all(
    node
      .getAnimations({ subtree: true })
      .map((animation) => animation.finished.catch(() => {})),
  );
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(async (image) => {
      try {
        await image.decode();
      } catch {
        throw new Error(
          "An image couldn't load. Please retry before exporting.",
        );
      }
      if (!image.naturalWidth)
        throw new Error("An image is missing. Try loading the post again.");
    }),
  );
  if (style.image && style.background === "image") {
    const image = new Image();
    image.src = style.image;
    await image.decode();
  }
  // Keep preview zoom on an ancestor; measure untransformed layout pixels here.
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  if (width * height * style.scale ** 2 > 64000000)
    throw new Error(
      "This export is too large. Choose a smaller scale or a fixed frame.",
    );
  const { domToPng, domToJpeg, domToWebp, domToSvg } =
    await import("modern-screenshot");
  const converters = {
    png: domToPng,
    jpeg: domToJpeg,
    webp: domToWebp,
    svg: domToSvg,
  };
  const data = await converters[format](node, {
    width,
    height,
    scale: style.scale,
    quality: style.quality / 100,
    backgroundColor:
      format === "jpeg" && style.background === "transparent"
        ? "#ffffff"
        : null,
    timeout: 30000,
    onCreateForeignObjectSvg: (svg) => {
      // Keep every font subset: preferredFormat in 4.7 can strip alternating src rules.
      const faces =
        (svg.querySelector("style")?.textContent ?? "").match(
          /@font-face\s*\{[^}]*\}/g,
        ) ?? [];
      if (
        (style.font !== "system" && !faces.length) ||
        faces.some((face) => !face.includes("data:"))
      )
        throw new Error(
          "A font couldn't be embedded. Please retry before exporting.",
        );
    },
    style: { transform: "none", margin: "0", animation: "none" },
  });
  const blob = await (await fetch(data)).blob();
  if (format !== "svg") return blob;
  // modern-screenshot scales the embedded raster but leaves the SVG viewport at 1×.
  const svg = new DOMParser().parseFromString(
    await blob.text(),
    "image/svg+xml",
  );
  svg.documentElement.setAttribute("width", String(width * style.scale));
  svg.documentElement.setAttribute("height", String(height * style.scale));
  return new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml",
  });
}

export function downloadImage(
  blob: Blob,
  post: Post,
  format: StyleState["format"],
) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${post.author.handle}-${post.id}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function uploadBackground(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (file.size > 10000000)
    throw new Error("Choose an image smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser couldn't process this image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.8, 0.65, 0.5, 0.35]) {
    const result = canvas.toDataURL("image/webp", quality);
    if (result.length <= 160000) return result;
  }
  throw new Error(
    "This image has too much detail for a shareable background. Try a smaller image.",
  );
}
