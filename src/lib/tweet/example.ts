import raw from "./example.json";
import { normalizeTweet } from "./normalize";

/** Authentic public text, captured from syndication on 2026-10-22; no live request. */
export const examplePost = normalizeTweet(raw);
export default examplePost;
