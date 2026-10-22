import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { screenshotDir } from "./paths";

async function ready(page: Page) {
  await expect(page.getByTestId("artboard")).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading post" })).toHaveCount(
    0,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>(".artboard img")].map(
        (image) => image.decode(),
      ),
    );
  });
}
async function toggle(page: Page, name: string) {
  // React Aria's switch input is visually hidden; click its visible label.
  await page
    .locator("label")
    .filter({ has: page.getByRole("switch", { name, exact: true }) })
    .click();
}
async function select(page: Page, name: string, option: string) {
  await page.getByRole("button", { name: new RegExp(`${name}$`) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function color(page: Page, name: string, value: string) {
  await page
    .getByRole("button", { name: `${name} color`, exact: true })
    .click();
  await page.getByRole("textbox", { name: `${name} hex` }).fill(value);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
}
async function bump(page: Page, name: string) {
  const slider = page.getByRole("slider", { name, exact: true });
  await slider.focus();
  await slider.press("ArrowRight");
}
async function download(page: Page, name: string) {
  const promise = page.waitForEvent("download", { timeout: 45000 });
  await page.getByRole("button", { name, exact: true }).click();
  const file = await promise;
  const path = `${screenshotDir}/${file.suggestedFilename()}`;
  await file.saveAs(path);
  return path;
}

test("content controls preserve authentic text while toggling every returned detail", async ({
  page,
}) => {
  await page.goto("/?post=2091946932037906774");
  await ready(page);
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  const text = await page
    .locator(".artboard .post-card > .post-text")
    .textContent();
  for (const [name, selector] of [
    ["Avatar", ".post-avatar"],
    ["Display name", ".post-name > span"],
    ["Username", ".post-handle"],
    ["Verified badge", "svg[aria-label$='verified']"],
    ["Photos & video", ".post-media"],
    ["Quoted post", ".post-quote"],
    ["Community Note", ".post-note"],
    ["Replies", "[aria-label^='Replies:']"],
    ["Likes", "[aria-label^='Likes:']"],
  ]) {
    const content = page.getByTestId("artboard").locator(selector);
    expect(await content.count()).toBeGreaterThan(0);
    await toggle(page, name);
    await expect(content).toHaveCount(0);
    await toggle(page, name);
    expect(await content.count()).toBeGreaterThan(0);
  }
  for (const name of ["Reposts", "Bookmarks", "Views"]) {
    await expect(
      page.getByRole("switch", { name, exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: `Why ${name.toLowerCase()} is unavailable` })
      .focus();
    await expect(
      page.getByRole("tooltip", { name: new RegExp(name.toLowerCase()) }),
    ).toContainText("never invent numbers");
    await page.keyboard.press("Escape");
  }
  for (const option of [
    "Relative time",
    "Date + time (UTC)",
    "Hidden",
    "Full date",
  ]) {
    await select(page, "Timestamp", option);
    await expect(page.locator(".artboard .post-timestamp")).toHaveCount(
      option === "Hidden" ? 0 : 1,
    );
  }
  await select(page, "Metric style", "Numbers only");
  await expect(page.locator(".artboard .post-metrics svg")).toHaveCount(0);
  await expect(page.locator(".artboard .post-metrics")).toContainText("Likes");
  await select(page, "Metric style", "Icons + numbers");
  expect(
    await page.locator(".artboard .post-metrics svg").count(),
  ).toBeGreaterThan(0);
  await select(page, "Metric style", "Compact · 1.2K");
  expect(
    await page.locator(".artboard .post-card > .post-text").textContent(),
  ).toBe(text);
  await page.goto("/?post=2039473910987534599");
  await ready(page);
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await toggle(page, "Reply context");
  await expect(page.locator(".artboard .post-reply")).toHaveCount(0);
  await toggle(page, "Reply context");
  await expect(page.locator(".artboard .post-reply")).toHaveCount(1);
  await toggle(page, "Show as thread context");
  await expect(page.locator(".artboard .post-parent")).toBeVisible();
  await page.screenshot({
    path: `${screenshotDir}/thread-context.png`,
    fullPage: true,
  });
  await toggle(page, "Show as thread context");
  await expect(page.locator(".artboard .post-parent")).toHaveCount(0);
  await page.goto("/?post=1683920951807971329");
  await ready(page);
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await toggle(page, "Link preview");
  await expect(page.locator(".artboard .post-link-card")).toHaveCount(0);
  await toggle(page, "Link preview");
  await expect(page.locator(".artboard .post-link-card")).toBeVisible();
});

test("all card, border, background and frame controls change the rendered design", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await ready(page);
  const card = page.locator(".artboard .post-card");
  const board = page.getByTestId("artboard");
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  for (const [theme, expected] of [
    ["Dim", "rgb(21, 32, 43)"],
    ["Lights out", "rgb(8, 8, 8)"],
    ["Light", "rgb(255, 255, 255)"],
  ]) {
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await expect(card).toHaveCSS("background-color", expected);
  }
  await color(page, "Background", "#faf0e5");
  await expect(card).toHaveCSS("background-color", "rgb(250, 240, 229)");
  await color(page, "Text", "#304050");
  await expect(card).toHaveCSS("color", "rgb(48, 64, 80)");
  await color(page, "Secondary", "#506070");
  await expect(page.locator(".artboard .post-handle")).toHaveCSS(
    "color",
    "rgb(80, 96, 112)",
  );
  await color(page, "Links", "#a04050");
  await expect(
    page.getByRole("radio", { name: "Custom", exact: true }),
  ).toBeChecked();
  for (const [font, expected] of [
    ["Lora · Serif", /Lora/],
    ["Geist Mono", /Geist Mono/],
    ["Geist", /Geist/],
    ["System", /Arial/],
    ["Inter", /Inter/],
  ] as const) {
    await select(page, "Typeface", font);
    await expect(card).toHaveCSS("font-family", expected);
  }
  for (const [name, css, expected] of [
    ["Font size", "font-size", "23px"],
    ["Card width", "width", "530px"],
    ["Inner padding", "padding-top", "33px"],
    ["Corner radius", "border-radius", "17px"],
  ]) {
    await bump(page, name);
    await expect(card).toHaveCSS(css, expected);
  }
  for (const shadow of ["None", "Strong", "Glow", "Soft"]) {
    await page.getByRole("radio", { name: shadow, exact: true }).click();
    if (shadow === "None") await expect(card).toHaveCSS("box-shadow", "none");
    else await expect(card).not.toHaveCSS("box-shadow", "none");
  }
  await toggle(page, "Glass effect");
  await expect(card).toHaveCSS("background-color", /0.72/);
  await toggle(page, "Glass effect");
  await expect(card).toHaveCSS("background-color", "rgb(250, 240, 229)");
  await page.getByRole("button", { name: "Border", exact: true }).click();
  await toggle(page, "Show border");
  await bump(page, "Border width");
  await expect(card).toHaveCSS("border-top-width", "2px");
  await color(page, "Border", "#407060");
  await expect(card).toHaveCSS("border-top-color", "rgb(64, 112, 96)");
  await page.getByRole("radio", { name: "Dashed", exact: true }).click();
  await expect(card).toHaveCSS("border-top-style", "dashed");
  await page.getByRole("radio", { name: "Gradient", exact: true }).click();
  await expect(card.locator(".post-gradient-border")).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await toggle(page, "Glass effect");
  await expect(card).toHaveCSS("background-color", /0.72/);
  await toggle(page, "Glass effect");
  await page.getByRole("radio", { name: "Solid", exact: true }).click();
  await toggle(page, "Show border");
  await expect(card).toHaveCSS("border-top-width", "0px");
  await page.getByRole("tab", { name: "Backdrop", exact: true }).click();
  for (const swatch of await page
    .getByRole("button", { name: /^Use .+ gradient$/ })
    .all()) {
    const before = await board.evaluate(
      (node) => getComputedStyle(node).backgroundImage,
    );
    await swatch.click();
    const selected = await swatch.getAttribute("aria-pressed");
    expect(selected).toBe("true");
    if (!(await swatch.getAttribute("aria-label"))?.includes("Daydream"))
      await expect(board).not.toHaveCSS("background-image", before);
  }
  await toggle(page, "Create your own gradient");
  await color(page, "First color", "#ffaaaa");
  await color(page, "Second color", "#aaffaa");
  await color(page, "Third color", "#aaaaff");
  await expect(board).toHaveCSS(
    "background-image",
    /255, 170, 170.*170, 255, 170.*170, 170, 255/,
  );
  await toggle(page, "Third color stop");
  await expect(board).not.toHaveCSS("background-image", /170, 170, 255/);
  await bump(page, "Gradient angle");
  await expect(board).toHaveCSS("background-image", /136deg/);
  await bump(page, "Canvas padding");
  await expect(board).toHaveCSS("width", "698px");
  await toggle(page, "Subtle grain");
  await expect(page.locator(".artboard-grain")).toHaveCount(1);
  await page.getByRole("radio", { name: "Solid", exact: true }).click();
  await color(page, "Canvas color", "#d0d8c0");
  await expect(board).toHaveCSS("background-color", "rgb(208, 216, 192)");
  await page.getByRole("radio", { name: "Mesh", exact: true }).click();
  for (const name of ["Bloom", "Aurora", "Silk", "Orbit"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(board).toHaveCSS("background-image", /radial-gradient/);
  }
  await page.getByRole("radio", { name: "None", exact: true }).click();
  await expect(board).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".artboard-grain")).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "Subtle grain" }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "Image", exact: true }).click();
  await page
    .getByLabel("Upload background image")
    .setInputFiles("public/grain.png");
  await expect(board).toHaveCSS("background-image", /data:image\/webp/);
  await page.getByRole("tab", { name: "Frame", exact: true }).click();
  for (const [name, height] of [
    ["Square 1:1", 698],
    ["Portrait 4:5", 873],
    ["Landscape 16:9", 393],
    ["Story 9:16", 1241],
    ["Classic 3:2", 465],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(board).toHaveCSS("height", `${height}px`);
    const boxes = await page.evaluate(() => {
      const a = document.querySelector(".artboard")!.getBoundingClientRect();
      const b = document
        .querySelector(".artboard .post-card")!
        .getBoundingClientRect();
      return {
        x: b.x - a.x,
        y: b.y - a.y,
        right: a.right - b.right,
        bottom: a.bottom - b.bottom,
      };
    });
    for (const value of Object.values(boxes))
      expect(value).toBeGreaterThanOrEqual(0);
    expect(Math.abs(boxes.x - boxes.right)).toBeLessThan(1);
    expect(Math.abs(boxes.y - boxes.bottom)).toBeLessThan(1);
  }
  await page.getByRole("button", { name: "Auto Hug content" }).click();
  await page.getByRole("button", { name: "Reset style" }).click();
  await expect(board).toHaveCSS("width", "680px");
});

test("saved looks, persistence, keyboard paste/download/copy, light mode and width boundaries", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Apply Paper look" }).click();
  await page.getByRole("button", { name: "Save look", exact: true }).click();
  await page.getByRole("textbox", { name: "Look name" }).fill("Editorial");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save look", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Reset style" }).click();
  await page.getByRole("button", { name: "Apply Editorial look" }).click();
  await expect(page.locator(".artboard .post-card")).toHaveCSS(
    "font-family",
    /Lora/,
  );
  await page
    .getByRole("button", { name: "Toggle light and dark mode" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: `${screenshotDir}/light-paper.png`,
    fullPage: true,
  });
  await page.evaluate(() =>
    navigator.clipboard.writeText(
      "https://x.com/NASA/status/2042533098567422255",
    ),
  );
  await page.locator(".canvas-heading").click();
  await page.keyboard.press("Control+v");
  await expect(page.locator(".artboard .post-card")).toHaveAttribute(
    "data-post-id",
    "2042533098567422255",
  );
  await ready(page);
  const pending = page.waitForEvent("download", { timeout: 45000 });
  await page.keyboard.press("Control+s");
  await (await pending).saveAs(`${screenshotDir}/photo-paper.png`);
  await page.locator(".canvas-heading").click();
  await page.keyboard.press("Control+c");
  await expect(
    page.getByText("Image copied. Go make someone's feed better."),
  ).toBeVisible();
  expect(
    await page.evaluate(async () =>
      (await navigator.clipboard.read()).flatMap((item) => item.types),
    ),
  ).toContain("image/png");
  for (const width of [360, 760, 768, 1024, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
  const fresh = await browser.newContext({ baseURL, colorScheme: "light" });
  const second = await fresh.newPage();
  await second.goto("/");
  await ready(second);
  await expect(second.locator("html")).toHaveAttribute("data-theme", "light");
  await fresh.close();
});

test("transparent PNG/WebP retain alpha, JPEG is white, and glass/media export successfully", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await ready(page);
  await page.getByRole("radio", { name: "None", exact: true }).click();
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  for (const format of ["PNG", "WebP", "JPEG"]) {
    await page.getByRole("radio", { name: format, exact: true }).click();
    const file = await download(page, `Download ${format.toUpperCase()}`);
    const data = (await readFile(file)).toString("base64");
    const pixel = await page.evaluate(
      async ({ data, format }) => {
        const image = new Image();
        image.src = `data:image/${format.toLowerCase()};base64,${data}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      },
      { data, format },
    );
    expect(pixel).toEqual(
      format === "JPEG" ? [255, 255, 255, 255] : [0, 0, 0, 0],
    );
  }
  await bump(page, "Image quality");
  for (const scale of ["1×", "3×", "4×", "2×"]) {
    await page.getByRole("radio", { name: scale, exact: true }).click();
    await expect(page.locator(".export-size strong")).toContainText(
      String(680 * Number(scale[0])),
    );
  }
  await page.getByRole("button", { name: "Apply Glass look" }).click();
  await download(page, "Download PNG");
  await page.screenshot({ path: `${screenshotDir}/glass.png`, fullPage: true });
});
