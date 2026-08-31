/**
 * Renders the built site in headless Chrome and screenshots it.
 *
 * GLSL only fails at runtime, so this is the shortest loop for tuning the look
 * (and for catching a shader that does not compile at all).
 *
 * Run: deno task preview   # in one terminal
 *      deno task shoot     # in another
 */

import puppeteer from "npm:puppeteer-core@^24";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = Deno.args[0] ?? "http://localhost:4173/";
const OUT = Deno.args[1] ?? "shot.png";
const SETTLE_MS = Number(Deno.args[2] ?? 7000);
const WIDTH = Number(Deno.args[3] ?? 1600);
const HEIGHT = Number(Deno.args[4] ?? 1000);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--hide-scrollbars",
    // Headless has no real GPU, so force a software GL stack that still gives us
    // a genuine WebGL context and therefore genuine shader compilation.
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

const problems: string[] = [];
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${text}`);
  else console.log(`  [${m.type()}] ${text}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) => problems.push(`[request] ${r.url()} ${r.failure()?.errorText}`));

console.log(`Loading ${URL_}`);
await page.goto(URL_, { waitUntil: "networkidle0", timeout: 60_000 });

// Let the staged reveal finish before capturing.
await new Promise((r) => setTimeout(r, SETTLE_MS));

const summary = await page.evaluate(() => ({
  ready: document.body.classList.contains("ready"),
  unsupported: document.body.classList.contains("unsupported"),
  // Confirm we got a real GL context rather than a silent fallback.
  webgl: (() => {
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    if (!gl) return "no gl context";
    return `${gl.getParameter(gl.VERSION)}`;
  })(),
}));

await page.screenshot({ path: OUT });
await browser.close();

console.log(`\n  ready:      ${summary.ready}`);
console.log(`  webgl:      ${summary.webgl}`);
console.log(`  screenshot: ${OUT}`);

if (problems.length) {
  console.log(`\n  ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 25)) console.log(`    ${p.slice(0, 2000)}`);
  Deno.exit(1);
}
console.log("\n  no console errors");
