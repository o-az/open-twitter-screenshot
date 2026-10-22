import { fileURLToPath } from "node:url";

export const screenshotDir = fileURLToPath(
  new URL("../screenshots", import.meta.url),
);
