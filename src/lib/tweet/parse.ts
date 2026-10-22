import type { TweetErrorCode } from "./types";

export class TweetException extends Error {
  constructor(
    public readonly code: TweetErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TweetException";
  }
}

export const ID_PATTERN = /^[1-9][0-9]{0,19}$/;
const hosts = new Set(
  [
    "twitter.com",
    "x.com",
    "mobile.twitter.com",
    "fxtwitter.com",
    "vxtwitter.com",
    "fixupx.com",
  ].flatMap((host) => [host, `www.${host}`]),
);

export function parseTweetId(input: string): string {
  const fail = () =>
    new TweetException(
      "MALFORMED_URL",
      "Enter a valid X or Twitter post URL, or a numeric post ID.",
    );
  if (typeof input !== "string" || input.length > 2048) throw fail();
  const value = input.trim();
  if (ID_PATTERN.test(value)) return value;
  // Reject URL parser normalization of slashes, encoded paths, and dot segments.
  const pathInput = value.split(/[?#]/)[0];
  if (
    /[\\\s]/.test(value) ||
    pathInput.includes("%") ||
    /(?:^|\/)\.{1,2}(?:\/|$)/.test(pathInput)
  )
    throw fail();
  const source = value.includes("://") ? value : `https://${value}`;
  const authority = /^https?:\/\/([^/?#]+)\//i.exec(source)?.[1];
  // Validate before URL's IDNA normalization (full-width lookalikes map to ASCII).
  if (!authority || !hosts.has(authority.toLowerCase())) throw fail();
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw fail();
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !hosts.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  )
    throw fail();
  const match =
    /^\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status\/([1-9][0-9]{0,19})(?:\/(?:photo|video)\/[1-4])?\/?$/.exec(
      url.pathname,
    );
  if (!match) throw fail();
  return match[1];
}
