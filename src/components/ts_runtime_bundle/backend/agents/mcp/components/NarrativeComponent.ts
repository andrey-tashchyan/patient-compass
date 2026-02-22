import path from "node:path";
import type { AgentComponent, AgentRunContext, NarrativePayload } from "../types.ts";
import { runPythonAgent } from "./PythonCliRunner.ts";

export class NarrativeComponent implements AgentComponent<NarrativePayload> {
  readonly name = "narrative_agent";

  async run(ctx: AgentRunContext): Promise<NarrativePayload> {
    const scriptPath = path.join(ctx.agentsDir, "narrative_agent.py");
    return runPythonAgent<NarrativePayload>(ctx.pythonBin ?? "python", scriptPath, [
      "--identifier",
      ctx.identifier,
      "--data-root",
      ctx.dataRoot,
    ]);
  }
}
