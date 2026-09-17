#!/usr/bin/env node
import { main } from "../src/cli.js";

// node:sqlite prints an ExperimentalWarning on Node 22; keep the CLI output clean.
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name !== "ExperimentalWarning") console.error(w);
});

main()
  .then((code) => process.exit(code ?? 0))
  .catch((err) => {
    console.error(`error: ${err.message}`);
    process.exit(1);
  });
