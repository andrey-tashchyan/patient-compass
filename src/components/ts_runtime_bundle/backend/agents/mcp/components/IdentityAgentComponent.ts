import path from "node:path";
import type { AgentComponent, AgentRunContext, IdentityPayload } from "../types.ts";
import { runPythonAgent } from "./PythonCliRunner.ts";

export class IdentityAgentComponent implements AgentComponent<IdentityPayload | null> {
  readonly name = "identity_agent";

  async run(ctx: AgentRunContext): Promise<IdentityPayload | null> {
    const scriptPath = path.join(ctx.agentsDir, "identity_agent.py");
    const payload = await runPythonAgent<IdentityPayload[]>(
      ctx.pythonBin ?? "python",
      scriptPath,
      ["--identifier", ctx.identifier, "--data-root", ctx.dataRoot],
    );

    return payload[0] ?? null;
  }
}
