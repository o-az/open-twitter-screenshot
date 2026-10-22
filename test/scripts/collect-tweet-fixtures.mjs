import { readFile, writeFile } from "node:fs/promises";

// IDs supplied by the react-tweet docs, Vercel blog, and linked public posts.
const ids = process.argv.slice(2);
const features =
  "tfw_timeline_list:;tfw_follower_count_sunset:true;tfw_tweet_edit_backend:on;tfw_refsrc_session:on;tfw_fosnr_soft_interventions_enabled:on;tfw_show_birdwatch_pivots_enabled:on;tfw_show_business_verified_badge:on;tfw_duplicate_scribes_to_settings:on;tfw_use_profile_image_shape_enabled:on;tfw_show_blue_verified_badge:on;tfw_legacy_timeline_sunset:true;tfw_show_gov_verified_badge:on;tfw_show_business_affiliate_badge:on;tfw_tweet_edit_frontend:on";
const fixtureFile = new URL("../fixtures/tweets.json", import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureFile, "utf8"));
for (const id of ids) {
  if (!/^[1-9]\d{0,19}$/.test(id)) throw new Error("Invalid ID");
  const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
  url.search = new URLSearchParams({
    id,
    lang: "en",
    features,
    token: ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, ""),
  }).toString();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const raw = await res.json();
    if (!res.ok || raw.id_str !== id) {
      console.log(id, res.status, "unavailable");
      continue;
    }
    fixtures.syndication[id] = raw;
    await writeFile(fixtureFile, JSON.stringify(fixtures, null, 2) + "\n");
    console.log(
      id,
      JSON.stringify({
        text: raw.text,
        media: raw.mediaDetails?.map((m) => m.type),
        photos: raw.photos?.length,
        video: !!raw.video,
        quote: !!raw.quoted_tweet,
        reply: !!raw.parent || !!raw.in_reply_to_screen_name,
        note: raw.note_tweet,
        card: raw.card,
        keys: Object.keys(raw),
      }),
    );
  } catch (error) {
    console.log(id, String(error));
  }
}
