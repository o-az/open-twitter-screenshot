import { validateImageUrl } from "@/lib/tweet/image";

export const runtime = "nodejs";
const MAX_BYTES = 12 * 1024 * 1024;
const types = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function matchesSignature(bytes: Uint8Array, type: string): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (type === "image/webp")
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return (
    type === "image/avif" &&
    ascii(4, 8) === "ftyp" &&
    /avif|avis/.test(ascii(8, 32))
  );
}

export async function GET(request: Request): Promise<Response> {
  let url: URL;
  try {
    url = validateImageUrl(new URL(request.url).searchParams.get("url") ?? "");
  } catch {
    return new Response("Invalid image URL", { status: 400 });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
      },
    });
    const type =
      upstream.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() ?? "";
    if (upstream.status !== 200 || !types.has(type) || !upstream.body) {
      await upstream.body?.cancel();
      clearTimeout(timer);
      return new Response("Image unavailable", { status: 502 });
    }
    const length = upstream.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) {
      await upstream.body.cancel();
      clearTimeout(timer);
      return new Response("Image too large", { status: 413 });
    }
    const reader = upstream.body.getReader();
    let total = 0;
    const initial: Uint8Array[] = [];
    while (total < 32) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_BYTES) {
        controller.abort();
        await reader.cancel();
        clearTimeout(timer);
        return new Response("Image too large", { status: 413 });
      }
      initial.push(chunk.value);
    }
    const prefix = new Uint8Array(Math.min(total, 32));
    let offset = 0;
    for (const chunk of initial) {
      const part = chunk.subarray(0, prefix.length - offset);
      prefix.set(part, offset);
      offset += part.length;
      if (offset === prefix.length) break;
    }
    if (!matchesSignature(prefix, type)) {
      controller.abort();
      await reader.cancel();
      clearTimeout(timer);
      return new Response("Invalid raster image", { status: 502 });
    }
    // Pull-based streaming keeps memory bounded; abort also covers a stalled body.
    const body = new ReadableStream<Uint8Array>({
      async pull(output) {
        try {
          const first = initial.shift();
          if (first) {
            output.enqueue(first);
            return;
          }
          const chunk = await reader.read();
          if (chunk.done) {
            clearTimeout(timer);
            output.close();
            return;
          }
          total += chunk.value.byteLength;
          if (total > MAX_BYTES) {
            controller.abort();
            await reader.cancel();
            clearTimeout(timer);
            output.error(new Error("Image too large"));
            return;
          }
          output.enqueue(chunk.value);
        } catch {
          clearTimeout(timer);
          controller.abort();
          output.error(new Error("Image stream unavailable"));
        }
      },
      async cancel() {
        clearTimeout(timer);
        controller.abort();
        await reader.cancel();
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    clearTimeout(timer);
    return new Response("Image unavailable", { status: 502 });
  }
}
