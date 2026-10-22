import { getTweet } from "@/lib/tweet";

export async function GET(request: Request): Promise<Response> {
  const result = await getTweet(
    new URL(request.url).searchParams.get("id") ?? "",
  );
  const status = result.error
    ? (
        {
          MALFORMED_URL: 400,
          NOT_FOUND: 404,
          DELETED: 404,
          PROTECTED: 403,
          AGE_RESTRICTED: 403,
          RATE_LIMITED: 429,
          UNAVAILABLE: 502,
        } as const
      )[result.error.code]
    : 200;
  return Response.json(result, {
    status,
    headers: {
      "Cache-Control": result.error
        ? "no-store"
        : "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
