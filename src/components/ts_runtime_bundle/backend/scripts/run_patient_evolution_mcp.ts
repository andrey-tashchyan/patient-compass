#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type CliOptions = {
  identifier: string;
  output?: string;
  dataRoot: string;
  agentsDir: string;
  pythonBin: string;
};

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_FILE);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  node backend/scripts/run_patient_evolution_mcp.ts --identifier <id> [--output <file>] [--data-root <dir>] [--agents-dir <dir>] [--python <bin>]",
      "",
      "Example:",
      "  node backend/scripts/run_patient_evolution_mcp.ts --identifier 12345 --output data/exports/12345_patient_evolution.json",
    ].join("\n"),
  );
}

function resolvePathArg(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function parseArgs(argv: string[]): CliOptions {
  let identifier = "";
  let output: string | undefined;
  let dataRoot = path.resolve(REPO_ROOT, "data");
  let agentsDir = path.resolve(REPO_ROOT, "backend/agents");
  let pythonBin = "python";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--identifier" && next) {
      identifier = next;
      i += 1;
      continue;
    }
    if (arg === "--output" && next) {
      output = next;
      i += 1;
      continue;
    }
    if (arg === "--data-root" && next) {
      dataRoot = resolvePathArg(next);
      i += 1;
      continue;
    }
    if (arg === "--agents-dir" && next) {
      agentsDir = resolvePathArg(next);
      i += 1;
      continue;
    }
    if (arg === "--python" && next) {
      pythonBin = next;
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }
  }

  if (!identifier) {
    throw new Error("Missing required --identifier");
  }

  return {
    identifier,
    output,
    dataRoot,
    agentsDir,
    pythonBin,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const pluginModulePath = pathToFileURL(path.join(options.agentsDir, "mcp/index.ts")).href;
  const { PatientEvolutionPlugin } = await import(pluginModulePath);

  const plugin = new PatientEvolutionPlugin({
    dataRoot: options.dataRoot,
    pythonBin: options.pythonBin,
    agentsDir: options.agentsDir,
  });

  const payload = await plugin.run(options.identifier);
  const json = JSON.stringify(payload, null, 2);

  if (options.output) {
    const outputPath = path.resolve(process.cwd(), options.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, "utf-8");
    console.error(`PatientEvolution saved to: ${outputPath}`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  printUsage();
  process.exit(1);
});
