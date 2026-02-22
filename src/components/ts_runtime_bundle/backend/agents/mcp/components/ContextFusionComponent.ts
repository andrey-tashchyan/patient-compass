import path from "node:path";
import type { AgentComponent, AgentRunContext, ContextPayload } from "../types.ts";
import { runPythonAgent } from "./PythonCliRunner.ts";

export class ContextFusionComponent implements AgentComponent<ContextPayload> {
  readonly name = "context_fusion_agent";

  async run(ctx: AgentRunContext): Promise<ContextPayload> {
    const scriptPath = path.join(ctx.agentsDir, "context_fusion_agent.py");
    return runPythonAgent<ContextPayload>(ctx.pythonBin ?? "python", scriptPath, [
      "--identifier",
      ctx.identifier,
      "--data-root",
      ctx.dataRoot,
    ]);
  }
}
