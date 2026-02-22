import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { componentTagger } from "lovable-tagger";

const readRequestBody = (req: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });

const writeJson = (res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const extensionFromMimeType = (mimeType: string): string => {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
};

const parseTranscriptFromStdout = (stdout: string): string | null => {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (typeof parsed?.transcript === "string") {
        return parsed.transcript.trim();
      }
    } catch {
      // Keep scanning older lines in case stdout contains extra logs.
    }
  }

  return null;
};

const resolveMedAsrPythonBin = async (): Promise<string> => {
  const candidates = [
    process.env.MEDASR_PYTHON_BIN,
    path.resolve(__dirname, "medasr-demo/bin/python3"),
    path.resolve(__dirname, "medasr-demo/bin/python"),
    path.resolve(__dirname, "../hackeurope/medasr-demo/bin/python3"),
    path.resolve(__dirname, "../hackeurope/medasr-demo/bin/python"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue until we find an available binary.
    }
  }

  return process.platform === "win32" ? "python" : "python3";
};

const runMedAsr = async (audioPath: string): Promise<string> => {
  const pythonBin = await resolveMedAsrPythonBin();
  const scriptPath = process.env.MEDASR_SCRIPT_PATH || path.resolve(__dirname, "scripts/medasr_transcribe.py");

  await fs.access(scriptPath);

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [scriptPath, "--input", audioPath], {
      cwd: __dirname,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start MedASR process: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `MedASR process exited with code ${code}`));
        return;
      }

      const transcript = parseTranscriptFromStdout(stdout);
      if (!transcript) {
        reject(new Error("MedASR returned an invalid transcript payload."));
        return;
      }

      resolve(transcript);
    });
  });
};

const medAsrProxyPlugin = () => ({
  name: "medasr-proxy",
  configureServer(server: { middlewares: { use: (middleware: (req: any, res: any, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if (req.method !== "POST" || !req.url?.startsWith("/api/medasr-transcribe")) {
        next();
        return;
      }

      void (async () => {
        try {
          const bodyRaw = await readRequestBody(req);
          const body = JSON.parse(bodyRaw || "{}");
          const audioBase64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
          const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/webm";

          if (!audioBase64) {
            writeJson(res, 400, { error: "Missing audio payload." });
            return;
          }

          const extension = extensionFromMimeType(mimeType);
          const tempFilePath = path.join(
            os.tmpdir(),
            `medasr-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
          );

          await fs.writeFile(tempFilePath, Buffer.from(audioBase64, "base64"));
          try {
            const transcript = await runMedAsr(tempFilePath);
            writeJson(res, 200, { transcript });
          } finally {
            await fs.rm(tempFilePath, { force: true });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected MedASR error.";
          writeJson(res, 500, { error: message });
        }
      })();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mode === "development" && medAsrProxyPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
