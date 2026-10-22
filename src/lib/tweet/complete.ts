import { z } from "zod";
import { normalizeTweet } from "./normalize";
import { ID_PATTERN, parseTweetId } from "./parse";
import type { Post } from "./types";

const sourceSchema = z
  .object({
    user: z.object({ id_str: z.string().regex(ID_PATTERN) }).passthrough(),
  })
  .passthrough();
const responseSchema = z.object({
  code: z.literal(200),
  status: z.object({
    id: z.string().regex(ID_PATTERN),
    url: z.string().url(),
    provider: z.literal("twitter"),
    is_note_tweet: z.literal(true),
    author: z.object({
      id: z.string().regex(ID_PATTERN),
      screen_name: z.string(),
    }),
    raw_text: z.object({
      text: z.string().min(1).max(100000),
      facets: z.array(z.unknown()).default([]),
    }),
  }),
});
const facetSchema = z.object({
  type: z.enum(["url", "mention", "hashtag", "symbol", "media"]),
  indices: z.tuple([
    z.number().int().nonnegative(),
    z.number().int().positive(),
  ]),
  original: z.string().min(1),
  replacement: z.string().optional(),
  display: z.string().optional(),
});

async function completeBody(
  source: z.infer<typeof sourceSchema>,
  post: Post,
): Promise<Post> {
  if (!post.isTruncated) return post;
  try {
    const response = await fetch(
      `https://api.fxtwitter.com/2/status/${post.id}`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(6000),
        redirect: "error",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      return post;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let body = "";
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 1024 * 1024) return post;
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      await reader.cancel();
    }
    const { status: full } = responseSchema.parse(JSON.parse(body));
    if (
      full.id !== post.id ||
      parseTweetId(full.url) !== post.id ||
      full.author.id !== source.user.id_str ||
      full.author.screen_name.toLowerCase() !== post.author.handle.toLowerCase()
    )
      return post;

    // Note entities use code points. Legacy media facets can instead refer to
    // the truncated body: never delete prose unless the original token matches.
    const chars = Array.from(full.raw_text.text);
    const facets = full.raw_text.facets.flatMap((value) => {
      const result = facetSchema.safeParse(value);
      if (!result.success) return [];
      const facet = result.data;
      const [start, end] = facet.indices;
      const prefix = {
        mention: "@",
        hashtag: "#",
        symbol: "$",
        url: "",
        media: "",
      }[facet.type];
      return start < end &&
        end <= chars.length &&
        chars.slice(start, end).join("") === prefix + facet.original
        ? [facet]
        : [];
    });
    const { text, segments } = normalizeTweet({
      ...source,
      text: full.raw_text.text,
      display_text_range: [0, chars.length],
      note_tweet: undefined,
      entities: {
        urls: facets
          .filter((f) => f.type === "url")
          .map((f) => ({
            indices: f.indices,
            expanded_url: f.replacement,
            display_url: f.display,
          })),
        media: facets
          .filter((f) => f.type === "media")
          .map((f) => ({ indices: f.indices })),
        user_mentions: facets
          .filter((f) => f.type === "mention")
          .map((f) => ({ indices: f.indices, screen_name: f.original })),
        hashtags: facets
          .filter((f) => f.type === "hashtag")
          .map((f) => ({ indices: f.indices, text: f.original })),
        symbols: facets
          .filter((f) => f.type === "symbol")
          .map((f) => ({ indices: f.indices, text: f.original })),
      },
    });
    const prefix = post.text.replace(/(?:…|\.{3})$/, "").trimEnd();
    if (!prefix || text.length <= post.text.length || !text.startsWith(prefix))
      return post;
    // Syndication remains authoritative for everything except the full body.
    return { ...post, text, segments, isTruncated: false };
  } catch {
    // A failed third-party lookup must not discard the available X response.
    return post;
  }
}

export async function completeLongPosts(
  raw: unknown,
  post: Post,
): Promise<Post> {
  const parsed = sourceSchema.safeParse(raw);
  if (!parsed.success) return post;
  const source = parsed.data;
  const [body, quote, parent] = await Promise.all([
    completeBody(source, post),
    post.quotedPost
      ? completeLongPosts(source.quoted_tweet, post.quotedPost)
      : undefined,
    post.replyTo?.post
      ? completeLongPosts(source.parent, post.replyTo.post)
      : undefined,
  ]);
  return {
    ...body,
    ...(quote ? { quotedPost: quote } : {}),
    ...(parent && post.replyTo
      ? { replyTo: { ...post.replyTo, post: parent } }
      : {}),
  };
}
