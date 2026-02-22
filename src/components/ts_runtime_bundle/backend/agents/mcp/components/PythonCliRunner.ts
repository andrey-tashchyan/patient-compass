import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function extractJsonFromStdout(stdout: string): unknown {
  const objectStart = stdout.indexOf("{");
  const arrayStart = stdout.indexOf("[");

  let start = -1;
  let expectedEndChar = "";
  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    start = objectStart;
    expectedEndChar = "}";
  } else if (arrayStart >= 0) {
    start = arrayStart;
    expectedEndChar = "]";
  }

  if (start < 0) {
    throw new Error(`Could not find JSON payload in stdout: ${stdout.slice(0, 300)}`);
  }

  const end = stdout.lastIndexOf(expectedEndChar);
  if (end < start) {
    throw new Error(`Could not find complete JSON payload in stdout: ${stdout.slice(0, 300)}`);
  }

  const raw = stdout.slice(start, end + 1);
  return JSON.parse(raw);
}

export async function runPythonAgent<T>(
  pythonBin: string,
  scriptPath: string,
  args: string[],
): Promise<T> {
  const { stdout, stderr } = await execFileAsync(pythonBin, [scriptPath, ...args], {
    maxBuffer: 25 * 1024 * 1024,
  });

  if (stderr && stderr.trim().length > 0) {
    // Many Python scripts log warnings to stderr; keep parsing stdout.
  }

  return extractJsonFromStdout(stdout) as T;
}
