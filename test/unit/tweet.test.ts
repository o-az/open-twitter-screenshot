import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTweet,
  imageUrl,
  normalizeTweet,
  parseTweetId,
  TweetException,
} from "@/lib/tweet";
import { GET as tweetGET } from "@/app/api/tweet/route";
import { GET as imageGET } from "@/app/api/img/route";
import { examplePost } from "@/lib/tweet/example";
import exampleRaw from "@/lib/tweet/example.json";
import fixtures from "../fixtures/tweets.json";

const { syndication, fxtwitter } = fixtures;
const text = syndication["2044234462972784792"];
const photo = syndication["2042533098567422255"];
const video = syndication["2040511285998313827"];
const gif = syndication["2019528095926206551"];
const reply = syndication["2039473910987534599"];
const long = syndication["1969515038512926823"];
const card = syndication["1683920951807971329"];
const noted = syndication["2091946932037906774"];
const rtl = syndication["2093466365457764848"];
const reportedLong = syndication["2113139207052865759"];
const fullLong = fxtwitter["2113139207052865759"];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parseTweetId public contract", () => {
  it.each(
    [
      "twitter.com",
      "x.com",
      "mobile.twitter.com",
      "fxtwitter.com",
      "vxtwitter.com",
      "fixupx.com",
    ].flatMap((host) => [host, `www.${host}`]),
  )("accepts %s and canonical path decorations", (host) => {
    expect(
      parseTweetId(
        `https://${host}/NASA/status/2042533098567422255/photo/1/?s=20&t=a%2Fb`,
      ),
    ).toBe(photo.id_str);
    expect(parseTweetId(`${host}/NASA/status/${photo.id_str}/`)).toBe(
      photo.id_str,
    );
  });
  it("accepts numeric and i/web URLs", () => {
    expect(parseTweetId(" 20 ")).toBe("20");
    expect(parseTweetId(`https://x.com/i/web/status/${text.id_str}`)).toBe(
      text.id_str,
    );
  });
  it.each([
    "https://ｘ.com/a/status/20",
    "https:///x.com/a/status/20",
    "https://x.com:443/a/status/20",
  ])("rejects normalized authority bypass %s", (value) => {
    expect(() => parseTweetId(value)).toThrow(TweetException);
  });
  it.each([
    "",
    "0",
    "01",
    "-1",
    "1e18",
    "123456789012345678901",
    "https://x.com.evil.test/a/status/20",
    "https://evilx.com/a/status/20",
    "https://x.com@evil.test/a/status/20",
    "https://a@x.com/a/status/20",
    "https://x.com:444/a/status/20",
    "https://x.com./a/status/20",
    "ftp://x.com/a/status/20",
    "https://x.com/a/status/20/extra",
    "https://x.com/a/../a/status/20",
    "https://x.com/a/status/%32%30",
    "https://x.com/a/status/20/photo/5",
    "https://x.com/a/status/20x",
    "https://x.com/a/status/20\\evil",
  ])("rejects %s", (input) => {
    expect(() => parseTweetId(input)).toThrow(TweetException);
    try {
      parseTweetId(input);
    } catch (error) {
      expect(error).toMatchObject({ code: "MALFORMED_URL" });
    }
  });
});

describe("normalizeTweet saved real responses", () => {
  it("validates every saved response without mutation", () => {
    for (const raw of Object.values(syndication)) {
      const before = JSON.stringify(raw);
      const post = normalizeTweet(raw);
      expect(post.segments.map((s) => s.text).join("")).toBe(post.text);
      expect(JSON.stringify(raw)).toBe(before);
    }
  });
  it.each([
    ["2042533098567422255", 1],
    ["2043798499771269626", 2],
    ["1878931655253192884", 3],
    ["2051361508181856362", 4],
  ] as const)("keeps all %s photos", (id, count) => {
    expect(normalizeTweet(syndication[id]).media).toHaveLength(count);
  });
  it("keeps authentic example text and optional metrics", () => {
    expect(examplePost.text).toBe(exampleRaw.text);
    expect(examplePost.author.handle).toBe("naval");
    expect(examplePost.metrics).toEqual({
      likes: exampleRaw.favorite_count,
      replies: exampleRaw.conversation_count,
    });
    expect(examplePost.media).toEqual([]);
  });
  it("normalizes photos, video posters, GIF, quote and reply one level", () => {
    expect(normalizeTweet(photo).media[0]).toMatchObject({
      type: "photo",
      url: photo.mediaDetails[0].media_url_https,
      width: photo.mediaDetails[0].original_info.width,
    });
    expect(normalizeTweet(video).media[0]).toMatchObject({
      type: "video",
      url: video.video.poster,
    });
    expect(normalizeTweet(video).metrics.views).toBeUndefined();
    expect(normalizeTweet(gif).media[0].type).toBe("gif");
    expect(normalizeTweet(gif).quotedPost?.id).toBe(gif.quoted_tweet.id_str);
    expect(normalizeTweet(reply).replyTo?.post?.id).toBe(reply.parent.id_str);
    expect(normalizeTweet(reply).replyTo?.post?.replyTo).toBeUndefined();
    expect(normalizeTweet(long).isTruncated).toBe(true);
    expect(normalizeTweet(photo).text).toBe("");
  });
  it("preserves actual card and Community Note, not invented placeholders", () => {
    expect(normalizeTweet(card).linkCard).toMatchObject({
      title: "Introducing React Tweet",
      domain: "vercel.com",
      url: "https://vercel.com/blog/introducing-react-tweet",
    });
    expect(normalizeTweet(noted).communityNote).toEqual({
      text: noted.birdwatch_pivot.subtitle.text,
      url: noted.birdwatch_pivot.destinationUrl,
    });
    expect(normalizeTweet(text).communityNote).toBeUndefined();
    expect(normalizeTweet(rtl).text).toBe(rtl.text);
  });
  it("synthetic: Unicode code-point entities, attachment stripping, decoding and verification", () => {
    const raw = {
      ...text,
      text: "😀 مرحبا &amp; https://t.co/a https://t.co/m",
      display_text_range: [0, 40],
      entities: {
        urls: [
          {
            indices: [14, 28],
            display_url: "example.com",
            expanded_url: "https://example.com",
          },
        ],
        media: [{ indices: [29, 43] }],
      },
      user: { ...text.user, verified_type: "Business" },
    };
    // Compute positions by code points, not UTF-16 offsets.
    const cp = Array.from(raw.text);
    const a = cp.join("").indexOf("https:") - 1;
    raw.display_text_range = [0, cp.length];
    raw.entities.urls[0].indices = [a, a + 14];
    raw.entities.media[0].indices = [a + 15, cp.length];
    const post = normalizeTweet(raw);
    expect(post.text).toBe("😀 مرحبا & example.com");
    expect(post.segments.find((s) => s.type === "link")?.href).toBe(
      "https://example.com",
    );
    expect(post.author.verified).toBe("gold");
    expect(
      normalizeTweet({
        ...text,
        user: { ...text.user, verified_type: "Government" },
      }).author.verified,
    ).toBe("gray");
  });
  it("synthetic: fallback media and malformed optional metadata", () => {
    expect(
      normalizeTweet({ ...video, mediaDetails: undefined }).media[0].type,
    ).toBe("video");
    expect(
      normalizeTweet({ ...photo, mediaDetails: undefined }).media[0].type,
    ).toBe("photo");
    expect(
      normalizeTweet({
        ...text,
        card: { url: "javascript:alert(1)" },
        birdwatch_pivot: {
          subtitle: { text: "x" },
          destinationUrl: "javascript:alert(1)",
        },
      }).linkCard,
    ).toBeUndefined();
    expect(() => normalizeTweet({ ...text, user: {} })).toThrow();
  });
});

describe("getTweet and GET /api/tweet", () => {
  it("recovers the reported long post without corrupting prose or replacing X metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(reportedLong))
        .mockResolvedValueOnce(Response.json(fullLong)),
    );
    const { post } = await getTweet(reportedLong.id_str);
    expect(post?.isTruncated).toBe(false);
    const expectedText = fullLong.status.raw_text.facets
      .filter((facet) => facet.type === "url")
      .reduce(
        (body, facet) => body.replaceAll(facet.replacement, facet.display),
        fullLong.status.text,
      );
    expect(post?.text).toBe(expectedText);
    expect(post?.text).toContain(
      "Some massive compromises and vulnerabilities came to light in the last 72 hours.",
    );
    expect(post?.text).toContain("OVHcloud CLI:");
    expect(post?.text.endsWith("but they only help once installed.")).toBe(
      true,
    );
    expect(post?.text.length).toBeGreaterThan(5000);
    expect(post?.text).not.toContain("https://t.co/");
    expect(
      post?.segments.filter((segment) => segment.type === "link"),
    ).toHaveLength(11);
    expect(
      post?.segments.find((segment) => segment.type === "link"),
    ).toMatchObject({
      text: "php.net/archive/2026.p…",
      href: "https://www.php.net/archive/2026.php#2026-10-21-5",
    });
    const original = normalizeTweet(reportedLong);
    expect(post).toMatchObject({
      author: original.author,
      metrics: original.metrics,
      media: original.media,
      createdAt: original.createdAt,
    });
  });
  it("synthetic: full-note entities use code points after emoji and ignore invalid ranges", async () => {
    const source = {
      ...reportedLong,
      text: "😀 Intro",
      display_text_range: [0, 7],
      entities: {},
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(source))
        .mockResolvedValueOnce(
          Response.json({
            ...fullLong,
            status: {
              ...fullLong.status,
              raw_text: {
                text: "😀 Intro https://t.co/a @alice #مرحبا $ABC ending",
                facets: [
                  {
                    type: "url",
                    indices: [8, 22],
                    original: "https://t.co/a",
                    replacement: "https://example.com",
                    display: "example.com",
                  },
                  { type: "mention", indices: [23, 29], original: "alice" },
                  { type: "hashtag", indices: [30, 36], original: "مرحبا" },
                  { type: "symbol", indices: [37, 41], original: "ABC" },
                  {
                    type: "media",
                    indices: [0, 7],
                    original: "https://t.co/stale",
                  },
                  {
                    type: "url",
                    indices: [48, 100],
                    original: "https://t.co/a",
                  },
                ],
              },
            },
          }),
        ),
    );
    const { post } = await getTweet(source.id_str);
    expect(post?.text).toBe("😀 Intro example.com @alice #مرحبا $ABC ending");
    expect(post?.isTruncated).toBe(false);
    expect(post?.segments.filter((segment) => segment.type !== "text")).toEqual(
      [
        { type: "link", text: "example.com", href: "https://example.com" },
        { type: "mention", text: "@alice", href: "https://x.com/alice" },
        {
          type: "hashtag",
          text: "#مرحبا",
          href: "https://x.com/hashtag/%D9%85%D8%B1%D8%AD%D8%A8%D8%A7",
        },
        { type: "link", text: "$ABC", href: "https://x.com/search?q=%24ABC" },
      ],
    );
  });
  it.each(["quoted_tweet", "parent"] as const)(
    "completes long %s context as well as top-level posts",
    async (key) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            Response.json({ ...text, [key]: reportedLong }),
          )
          .mockResolvedValueOnce(Response.json(fullLong)),
      );
      const { post } = await getTweet(text.id_str);
      const context = key === "parent" ? post?.replyTo?.post : post?.quotedPost;
      expect(context?.isTruncated).toBe(false);
      expect(context?.text.endsWith("but they only help once installed.")).toBe(
        true,
      );
      expect(post?.text).toBe(text.text);
    },
  );
  it.each([
    ["wrong post", { id: "20" }],
    ["wrong canonical URL", { url: "https://x.com/jack/status/20" }],
    ["wrong author", { author: { ...fullLong.status.author, id: "20" } }],
    ["wrong provider", { provider: "other" }],
    ["not a full note", { is_note_tweet: false }],
    [
      "unrelated body",
      { raw_text: { text: "An unrelated long post", facets: [] } },
    ],
    [
      "still truncated",
      { raw_text: { text: normalizeTweet(reportedLong).text, facets: [] } },
    ],
  ])(
    "synthetic: preserves the X preview when fallback validation fails (%s)",
    async (_name, patch) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(Response.json(reportedLong))
          .mockResolvedValueOnce(
            Response.json({
              ...fullLong,
              status: { ...fullLong.status, ...patch },
            }),
          ),
      );
      expect((await getTweet(reportedLong.id_str)).post).toEqual(
        normalizeTweet(reportedLong),
      );
    },
  );
  it("synthetic: unavailable, malformed, oversized, and timed-out fallbacks preserve the X preview", async () => {
    for (const response of [
      new Response("unavailable", { status: 503 }),
      new Response("not JSON"),
      new Response(" ".repeat(1024 * 1024 + 1)),
      Response.json({ code: 200, status: { type: "tombstone" } }),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(Response.json(reportedLong))
          .mockResolvedValueOnce(response),
      );
      expect((await getTweet(reportedLong.id_str)).post).toEqual(
        normalizeTweet(reportedLong),
      );
    }
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(reportedLong))
        .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError")),
    );
    expect((await getTweet(reportedLong.id_str)).post).toEqual(
      normalizeTweet(reportedLong),
    );
  });
  it("uses exact upstream numeric token, complete features and one-hour fetch cache", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(text));
    vi.stubGlobal("fetch", fetcher);
    expect((await getTweet(text.id_str)).post?.text).toBe(text.text);
    const [url, options] = fetcher.mock.calls[0] as [
      URL,
      RequestInit & { next: { revalidate: number } },
    ];
    expect(url.searchParams.get("token")).toBe(
      ((Number(text.id_str) / 1e15) * Math.PI)
        .toString(36)
        .replace(/(0+|\.)/g, ""),
    );
    expect(url.searchParams.get("features")).toContain(
      "tfw_show_birdwatch_pivots_enabled:on",
    );
    expect(url.searchParams.get("features")).toContain(
      "tfw_show_gov_verified_badge:on",
    );
    expect(options.next.revalidate).toBe(3600);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([
    [{}, 200, "NOT_FOUND"],
    [{ __typename: "TweetTombstone" }, 200, "NOT_FOUND"],
    [{}, 404, "NOT_FOUND"],
    [{}, 429, "RATE_LIMITED"],
    [{}, 403, "UNAVAILABLE"],
    [{}, 500, "UNAVAILABLE"],
    [null, 200, "UNAVAILABLE"],
    [{ reason: "deleted" }, 200, "DELETED"],
    [{ reason: "protected" }, 200, "PROTECTED"],
    [{ reason: "age_restricted" }, 200, "AGE_RESTRICTED"],
  ])(
    "synthetic: classifies only explicit reasons (%j/%s)",
    async (body, status, code) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json(body, { status })),
      );
      expect((await getTweet(text.id_str)).error?.code).toBe(code);
    },
  );
  it("synthetic: sensitive is not age restricted; wrong IDs and transport/JSON errors fail safely", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ ...text, possibly_sensitive: true }),
      )
      .mockResolvedValueOnce(Response.json(photo))
      .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"))
      .mockResolvedValueOnce(new Response("<html>"));
    vi.stubGlobal("fetch", fetcher);
    expect((await getTweet(text.id_str)).post).toBeDefined();
    for (let i = 0; i < 3; i++)
      expect((await getTweet(text.id_str)).error?.code).toBe("UNAVAILABLE");
  });
  it("returns structured HTTP errors and does not fetch malformed input", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const bad = await tweetGET(
      new Request("https://local.test/api/tweet?id=bad"),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({
      error: { code: "MALFORMED_URL" },
    });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(Response.json(text));
    const ok = await tweetGET(
      new Request(`https://local.test/api/tweet?id=${text.id_str}`),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toContain("s-maxage=3600");
  });
});

const imageRequest = (url: string) =>
  new Request(`https://local.test/api/img?url=${encodeURIComponent(url)}`);
describe("imageUrl and GET /api/img security boundary", () => {
  it.each([
    "http://pbs.twimg.com/a.jpg",
    "https://pbs.twimg.com.evil.test/a",
    "https://pbs.twimg.com@127.0.0.1/a",
    "https://user@pbs.twimg.com/a",
    "https://pbs.twimg.com:444/a",
    "https://pbs.twimg.com:443/a",
    "https://127.0.0.1/a",
    "https://video.twimg.com.evil/a",
    "https://pbs.twimg.com\\@evil.test/a",
    "data:image/png,abc",
    "//pbs.twimg.com/a",
    "https://pbs.twimg.com./a",
  ])("blocks %s before fetching", async (url) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(() => imageUrl(url)).toThrow();
    expect((await imageGET(imageRequest(url))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("streams bounded raster images without forwarding client headers", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const fetcher = vi.fn().mockResolvedValue(
      new Response(bytes, {
        headers: { "content-type": "image/png", "set-cookie": "secret=1" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await imageGET(
      imageRequest("https://pbs.twimg.com/media/image.png?name=large"),
    );
    expect(result.status).toBe(200);
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes);
    expect(result.headers.get("set-cookie")).toBeNull();
    expect(result.headers.get("cache-control")).toContain("immutable");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    expect(imageUrl("https://pbs.twimg.com/a.png")).toBe(
      "/api/img?url=https%3A%2F%2Fpbs.twimg.com%2Fa.png",
    );
  });
  it.each([
    [302, "image/png"],
    [200, "image/svg+xml"],
    [200, "text/html"],
    [404, "image/png"],
  ])("rejects upstream %s %s", async (status, type) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("bad", {
          status,
          headers: { "content-type": type, location: "http://127.0.0.1" },
        }),
      ),
    );
    expect(
      (await imageGET(imageRequest("https://pbs.twimg.com/a"))).status,
    ).toBe(502);
  });
  it("rejects excessive declared and chunked bodies and fetch failures", async () => {
    const first = new Uint8Array(32);
    first.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const chunks = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(first);
        c.enqueue(new Uint8Array(12 * 1024 * 1024));
        c.close();
      },
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("x", {
          headers: {
            "content-type": "image/png",
            "content-length": "999999999",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(chunks, { headers: { "content-type": "image/png" } }),
      )
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await imageGET(imageRequest("https://pbs.twimg.com/a"))).status,
    ).toBe(413);
    const streamed = await imageGET(imageRequest("https://pbs.twimg.com/a"));
    await expect(streamed.arrayBuffer()).rejects.toThrow();
    expect(
      (await imageGET(imageRequest("https://pbs.twimg.com/a"))).status,
    ).toBe(502);
  });
  it("rejects a non-image body disguised as a raster MIME", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
          headers: { "content-type": "image/png" },
        }),
      ),
    );
    expect(
      (await imageGET(imageRequest("https://pbs.twimg.com/a"))).status,
    ).toBe(502);
  });
});
