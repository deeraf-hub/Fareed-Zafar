/**
 * Starts the Playwright MCP server (npx @playwright/mcp@latest) so Claude Code
 * can drive a real browser. Registered in .mcp.json for every session on this repo.
 *
 * On your own computer it runs Playwright MCP with its defaults (visible Chrome).
 * In Claude Code on the web (cloud sandbox) it also:
 *   • uses the pre-installed Chromium, headless — there is no Chrome or display,
 *     and @playwright/mcp@latest expects a newer Chromium build than the one installed
 *   • trusts the sandbox's HTTPS proxy CA, which Chromium does not read from the
 *     system certificate store (without this, HTTPS pages fail with
 *     ERR_CERT_AUTHORITY_INVALID)
 *
 * Extra arguments are passed through, e.g. `node scripts/playwright-mcp.js --caps vision`.
 */
import { spawn } from "node:child_process";
import { createHash, X509Certificate } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLOUD_CHROMIUM = "/opt/pw-browsers/chromium";
const CLOUD_PROXY_CA = "/root/.ccr/agent-proxy-ca.crt";

const args = ["-y", "@playwright/mcp@latest"];

if (existsSync(CLOUD_CHROMIUM)) {
  args.push(
    "--headless",
    "--browser", "chromium",
    "--executable-path", CLOUD_CHROMIUM,
    "--no-sandbox",
    "--isolated"
  );

  if (existsSync(CLOUD_PROXY_CA)) {
    // Trust the proxy CA by its public key — the same CA every other tool in the sandbox trusts.
    const pems = readFileSync(CLOUD_PROXY_CA, "utf8").match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
    ) ?? [];
    const spkiHashes = pems.map((pem) =>
      createHash("sha256")
        .update(new X509Certificate(pem).publicKey.export({ type: "spki", format: "der" }))
        .digest("base64")
    );
    const configFile = join(tmpdir(), `playwright-mcp-${process.pid}.json`);
    writeFileSync(
      configFile,
      JSON.stringify({
        browser: {
          launchOptions: { args: [`--ignore-certificate-errors-spki-list=${spkiHashes.join(",")}`] },
        },
      })
    );
    args.push("--config", configFile);
  }
}

args.push(...process.argv.slice(2));

const child = spawn("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
