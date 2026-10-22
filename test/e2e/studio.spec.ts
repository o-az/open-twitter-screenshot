import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
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
        (img) => img.decode(),
      ),
    );
  });
}
async function loadPost(page: Page, id: string) {
  await page
    .getByRole("textbox", { name: "X post URL" })
    .fill(`https://x.com/i/status/${id}`);
  await page.getByRole("button", { name: "Create image", exact: true }).click();
  await expect(page.locator(".artboard .post-card")).toHaveAttribute(
    "data-post-id",
    id,
  );
  await ready(page);
}

test("real syndication posts render faithfully through the complete UI", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      errors.push(message.text());
  });
  await mkdir(screenshotDir, { recursive: true });
  await page.goto("/");
  await ready(page);
  await page.screenshot({
    path: `${screenshotDir}/01-landing.png`,
    fullPage: true,
  });
  const cases = [
    {
      name: "text",
      id: "2044234462972784792",
      selector: ".post-text",
      count: 1,
    },
    {
      name: "one-image",
      id: "2042533098567422255",
      selector: ".media-item",
      count: 1,
    },
    {
      name: "two-images",
      id: "2040114143626244576",
      selector: ".media-item",
      count: 2,
    },
    {
      name: "three-images",
      id: "1878931655253192884",
      selector: ".media-item",
      count: 3,
    },
    {
      name: "four-images",
      id: "2051361508181856362",
      selector: ".media-item",
      count: 4,
    },
    {
      name: "video",
      id: "2040511285998313827",
      selector: ".media-play",
      count: 1,
    },
    {
      name: "quote-gif",
      id: "2019528095926206551",
      selector: ".post-quote",
      count: 1,
    },
    {
      name: "reply",
      id: "2039473910987534599",
      selector: ".post-reply",
      count: 1,
    },
    {
      name: "emoji",
      id: "2040059740848283920",
      selector: ".media-item",
      count: 1,
    },
    {
      name: "long-complete",
      id: "1969515038512926823",
      selector: ".post-truncated",
      count: 0,
    },
    {
      name: "link-card",
      id: "1683920951807971329",
      selector: ".post-link-card",
      count: 1,
    },
    {
      name: "rtl",
      id: "2093466365457764848",
      selector: ".post-text",
      count: 1,
    },
    {
      name: "community-note",
      id: "2091946932037906774",
      selector: ".post-note",
      count: 1,
    },
  ];
  for (const item of cases) {
    await loadPost(page, item.id);
    await expect(
      page.getByTestId("artboard").locator(item.selector),
    ).toHaveCount(item.count);
    await expect(page.locator(".post-error[role=alert]")).toHaveCount(0);
    if (item.name === "long-complete")
      await expect(page.locator(".artboard .post-text")).toContainText(
        "Demo: shell.turso.tech",
      );
    if (item.name === "one-image") {
      const grid = await page.locator(".artboard .post-media").boundingBox();
      const image = await page.locator(".artboard .media-item").boundingBox();
      expect(image!.width).toBeCloseTo(grid!.width, 1);
      expect(image!.width / image!.height).toBeCloseTo(1242 / 1920, 3);
    }
    await page.screenshot({
      path: `${screenshotDir}/${item.name}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("long posts open readable at the top, fit in one click, and export full height", async ({
  page,
}) => {
  await page.goto("/?at=1792672099067&post=2113139207052865759#s=e30");
  await ready(page);
  const body = page.locator(".artboard .post-text");
  await expect(body).toContainText(
    "To the best of my knowledge, fixes are out for all the ones that need them, but they only help once installed.",
  );
  await expect(body).toContainText("OVHcloud CLI:");
  await expect(page.locator(".artboard .post-truncated")).toHaveCount(0);
  await expect(page.locator(".post-error[role=alert]")).toHaveCount(0);
  await page.evaluate(async () => {
    await Promise.all(
      document
        .querySelector(".artboard")!
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const bounds = await page.getByTestId("artboard").boundingBox();
  const textBounds = await body.boundingBox();
  expect(textBounds!.y + textBounds!.height).toBeLessThan(
    bounds!.y + bounds!.height,
  );
  const viewport = page.locator(".preview-viewport");
  const viewportBounds = (await viewport.boundingBox())!;
  expect(bounds!.width).toBeGreaterThan(500);
  expect(bounds!.y).toBeGreaterThanOrEqual(viewportBounds.y);
  expect(bounds!.y + bounds!.height).toBeGreaterThan(
    viewportBounds.y + viewportBounds.height,
  );
  await expect(page.getByRole("button", { name: "Fit all" })).toBeVisible();
  await viewport.focus();
  await page.keyboard.press("End");
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(4000);
  const footer = (await page.locator(".artboard .post-metrics").boundingBox())!;
  expect(footer.y + footer.height).toBeLessThan(
    viewportBounds.y + viewportBounds.height,
  );
  // Export while zoomed in and scrolled down, not just from the overview.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const image = await download;
  await image.saveAs(`${screenshotDir}/reported-long-export.png`);
  const png = await readFile(`${screenshotDir}/reported-long-export.png`);
  expect(png.readUInt32BE(16)).toBe(1360);
  expect(png.readUInt32BE(20)).toBeGreaterThan(8000);
  await page.getByRole("button", { name: "Fit all" }).click();
  await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBe(0);
  await expect
    .poll(() =>
      viewport.evaluate((node) => node.scrollHeight - node.clientHeight),
    )
    .toBeLessThanOrEqual(1);
  const fitted = (await page.getByTestId("artboard").boundingBox())!;
  expect(fitted.height).toBeLessThan(viewportBounds.height);
  await page.getByRole("button", { name: "Zoom out" }).click();
  expect(
    (await page.getByTestId("artboard").boundingBox())!.width,
  ).toBeLessThan(fitted.width);
  await page.getByRole("button", { name: "Fit all" }).click();
  await page
    .locator(".preview-workspace")
    .screenshot({ path: `${screenshotDir}/reported-long-complete.png` });
  await loadPost(page, "2044234462972784792");
  expect(
    await viewport.evaluate((node) => node.scrollHeight - node.clientHeight),
  ).toBeLessThanOrEqual(1);
  await loadPost(page, "2113139207052865759");
  expect(
    (await page.getByTestId("artboard").boundingBox())!.width,
  ).toBeGreaterThan(500);
  expect(await viewport.evaluate((node) => node.scrollTop)).toBe(0);
});

test("looks, colors, geometry, sharing, clipboard and all four export formats", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Apply Midnight look" }).click();
  await expect(page.locator(".artboard .post-card")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  const width = page.getByRole("slider", { name: "Card width" });
  await width.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".artboard .post-card")).toHaveCSS(
    "width",
    "530px",
  );
  await page.getByRole("tab", { name: "Frame", exact: true }).click();
  await page.getByRole("button", { name: "Square 1:1" }).click();
  const dimensions = await page
    .getByTestId("artboard")
    .evaluate((node: HTMLElement) => ({
      width: node.offsetWidth,
      height: node.offsetHeight,
    }));
  expect(dimensions).toEqual({ width: 690, height: 690 });
  const shareUrl = page.url();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const shared = await context.newPage();
  await shared.goto(shareUrl);
  await ready(shared);
  await expect(shared.locator(".artboard .post-card")).toHaveCSS(
    "width",
    "530px",
  );
  await expect(shared.locator(".artboard .post-card")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  expect(
    await shared
      .getByTestId("artboard")
      .evaluate((node: HTMLElement) => [node.offsetWidth, node.offsetHeight]),
  ).toEqual([690, 690]);
  await shared.screenshot({
    path: `${screenshotDir}/shared-midnight.png`,
    fullPage: true,
  });
  await context.close();
  await page.getByRole("button", { name: "Apply Daydream look" }).click();
  await ready(page);
  await page.getByTestId("artboard").evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  // Compare exports against a native 2× screenshot, independent of the exporter.
  // Align to whole pixels so screenshot clip rounding doesn't add an extra row.
  const captureStyles = await page.addStyleTag({
    content:
      ".preview-zoom { transform: none !important; } .preview-art { position: fixed !important; left: 0; top: 0; z-index: 100; width: auto !important; height: auto !important; } .preview-workspace { overflow: visible !important; }",
  });
  const reference = (
    await page
      .getByTestId("artboard")
      .screenshot({ path: `${screenshotDir}/export-reference.png` })
  ).toString("base64");
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  for (const format of ["PNG", "JPEG", "WebP", "SVG"]) {
    await page.getByRole("radio", { name: format, exact: true }).click();
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: `Download ${format.toUpperCase()}`,
        exact: true,
      })
      .click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(
      `naval-2044234462972784792.${format.toLowerCase()}`,
    );
    const file = `${screenshotDir}/export.${format.toLowerCase()}`;
    await download.saveAs(file);
    expect((await readFile(file)).length).toBeGreaterThan(1000);
    const expected = await page
      .getByTestId("artboard")
      .evaluate((node: HTMLElement) => [
        node.offsetWidth * 2,
        node.offsetHeight * 2,
      ]);
    const data = await readFile(file);
    const actual = await page.evaluate(
      async ({ base64, mime }) => {
        const image = new Image();
        image.src = `data:${mime};base64,${base64}`;
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      },
      {
        base64: data.toString("base64"),
        mime:
          format === "SVG" ? "image/svg+xml" : `image/${format.toLowerCase()}`,
      },
    );
    expect(actual).toEqual(expected);
    const difference = await page.evaluate(
      async ({ reference, output, mime }) => {
        const pixels = async (src: string) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, image.width, image.height).data;
        };
        const a = await pixels(`data:image/png;base64,${reference}`);
        const b = await pixels(`data:${mime};base64,${output}`);
        if (a.length !== b.length)
          throw new Error("Export and preview dimensions differ");
        let squared = 0;
        for (let i = 0; i < a.length; i++) squared += (a[i] - b[i]) ** 2;
        return Math.sqrt(squared / a.length) / 255;
      },
      {
        reference,
        output: data.toString("base64"),
        mime:
          format === "SVG" ? "image/svg+xml" : `image/${format.toLowerCase()}`,
      },
    );
    // Lossy encoders differ slightly; fallback fonts change wrapping by far more.
    expect(difference).toBeLessThan(0.01);
  }
  await captureStyles.evaluate((node) => node.parentNode?.removeChild(node));
  await page.getByRole("button", { name: "Copy image as PNG" }).click();
  await expect(
    page.getByText("Image copied. Go make someone's feed better."),
  ).toBeVisible();
  const types = await page.evaluate(async () =>
    (await navigator.clipboard.read()).flatMap((item) => item.types),
  );
  expect(types).toContain("image/png");
  await page.screenshot({
    path: `${screenshotDir}/export-panel.png`,
    fullPage: true,
  });
});

test("unavailable metrics, invalid input, unavailable posts, and modal keyboard controls", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Reposts", exact: true }),
  ).toBeDisabled();
  await page.getByRole("switch", { name: "Avatar", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".artboard .post-avatar")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "X post URL" })
    .fill("https://evil.test/naval/status/20");
  await page.getByRole("button", { name: "Create image", exact: true }).click();
  await expect(page.getByText("Let's try another link")).toBeVisible();
  await page.screenshot({
    path: `${screenshotDir}/invalid-url.png`,
    fullPage: true,
  });
  await page.getByRole("textbox", { name: "X post URL" }).fill("1");
  await page.getByRole("button", { name: "Create image", exact: true }).click();
  await expect(
    page.getByText("This post is unavailable. It may be private or deleted."),
  ).toBeVisible();
  await page.locator(".canvas-heading").click();
  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: "A little less clicking" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("390px touch layout keeps canvas and bottom drawer usable", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto("/");
  await ready(page);
  expect(
    await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: `${screenshotDir}/mobile.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Customize", exact: true }).tap();
  const dialog = page.getByRole("dialog", { name: "Design your post" });
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => (await dialog.boundingBox())?.y)
    .toBeGreaterThan(290);
  await dialog.getByRole("button", { name: "Use Sage gradient" }).tap();
  await expect(page.getByTestId("artboard")).toHaveCSS(
    "background-image",
    /216, 223, 204/,
  );
  await page.screenshot({
    path: `${screenshotDir}/mobile-drawer.png`,
    fullPage: false,
  });
  const canvas = await page.getByTestId("artboard").boundingBox();
  const drawer = await dialog.boundingBox();
  expect(canvas!.y + canvas!.height).toBeLessThan(drawer!.y);
  await dialog
    .locator("label")
    .filter({
      has: page.getByRole("switch", { name: "Subtle grain", exact: true }),
    })
    .tap();
  await expect(page.locator(".artboard-grain")).toHaveCount(1);
  await context.close();
});

test("synthetic explicit failure responses and delayed loading are accessible", async ({
  page,
}) => {
  let release: () => void = () => {};
  let message = "";
  let code = "";
  await page.route("**/api/tweet?*", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: code === "RATE_LIMITED" ? 429 : 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code, message } }),
    });
  });
  await page.goto("/");
  await ready(page);
  for (const failure of [
    ["DELETED", "This post has been deleted."],
    ["PROTECTED", "This post is protected."],
    ["AGE_RESTRICTED", "This post is age restricted."],
    [
      "RATE_LIMITED",
      "X is receiving too many requests. Please try again shortly.",
    ],
  ]) {
    [code, message] = failure;
    await page.getByRole("textbox", { name: "X post URL" }).fill("20");
    await page
      .getByRole("button", { name: "Create image", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Loading post" }),
    ).toBeVisible();
    if (code === "DELETED")
      await page.screenshot({
        path: `${screenshotDir}/loading.png`,
        fullPage: true,
      });
    release();
    await expect(
      page.getByRole("alert").filter({ hasText: message }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Loading post" }),
    ).toHaveCount(0);
  }
});
