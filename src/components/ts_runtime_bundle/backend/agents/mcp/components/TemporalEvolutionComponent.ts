import path from "node:path";
import type { AgentComponent, AgentRunContext, TemporalPayload } from "../types.ts";
import { runPythonAgent } from "./PythonCliRunner.ts";

export class TemporalEvolutionComponent implements AgentComponent<TemporalPayload> {
  readonly name = "temporal_evolution_agent";

  async run(ctx: AgentRunContext): Promise<TemporalPayload> {
    const scriptPath = path.join(ctx.agentsDir, "temporal_evolution_agent.py");
    return runPythonAgent<TemporalPayload>(ctx.pythonBin ?? "python", scriptPath, [
      "--identifier",
      ctx.identifier,
      "--data-root",
      ctx.dataRoot,
    ]);
  }
}
