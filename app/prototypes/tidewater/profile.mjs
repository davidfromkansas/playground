// Run against a local production build. Log only timings and renderer details.
import { chromium } from "playwright";
const origin = new URL(process.argv[2] || "http://127.0.0.1:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
  throw Error("The profiler expects a loopback server.");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1360, height: 850 },
    deviceScaleFactor: 1,
  });
  if (process.env.PLAYGROUND_PASSWORD) {
    const login = await context.request.post(
      new URL("/api/auth", origin).href,
      { data: { password: process.env.PLAYGROUND_PASSWORD } },
    );
    if (!login.ok()) throw Error("Playground sign-in failed.");
  }
  const page = await context.newPage();
  await page.goto(new URL("/prototypes/tidewater", origin).href);
  await page.waitForFunction(() =>
    /\d+ FPS/.test(document.querySelector(".tw-fps")?.textContent || ""),
  );
  const canvas = page.locator(".tw-stage canvas");
  console.log(
    await canvas.evaluate((el) => {
      const gl = el.getContext("webgl2"),
        info = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        renderer: info
          ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        browser: navigator.userAgent,
      };
    }),
  );
  const box = await canvas.boundingBox();
  for (const quality of ["Balanced", "Low", "High"]) {
    await page.getByRole("button", { name: "Calm", exact: true }).click();
    await page.locator(".tw-desktop select").selectOption(quality);
    await page.getByRole("button", { name: "Beach camera" }).click();
    await page.waitForTimeout(2500);
    for (const moving of [false, true]) {
      const x = box.x + box.width * 0.55,
        y = box.y + box.height * 0.55;
      if (moving) {
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
      let done = false;
      const sample = page
        .evaluate(
          () =>
            new Promise((resolve) => {
              let start, previous;
              const intervals = [];
              function frame(time) {
                if (start === undefined) start = time;
                else intervals.push(time - previous);
                previous = time;
                if (time - start < 6000 || intervals.length < 12) {
                  requestAnimationFrame(frame);
                  return;
                }
                intervals.sort((a, b) => a - b);
                const el = document.querySelector(".tw-stage canvas");
                resolve({
                  width: el.width,
                  height: el.height,
                  frames: intervals.length,
                  seconds: (time - start) / 1000,
                  fps: (1000 * intervals.length) / (time - start),
                  p95ms: intervals[Math.floor(intervals.length * 0.95)],
                });
              }
              requestAnimationFrame(frame);
            }),
        )
        .finally(() => {
          done = true;
        });
      if (moving) {
        const start = performance.now();
        while (!done) {
          const t = (performance.now() - start) / 1000;
          await page.mouse.move(
            x + box.width * 0.1 * Math.sin(t * 1.3),
            y + box.height * 0.035 * Math.sin(t * 1.9),
          );
          await page.waitForTimeout(35);
        }
        await page.mouse.up();
      }
      console.log(
        JSON.stringify({
          quality,
          camera: moving ? "orbit" : "stationary",
          ...(await sample),
        }),
      );
    }
  }
} finally {
  await browser.close();
}
