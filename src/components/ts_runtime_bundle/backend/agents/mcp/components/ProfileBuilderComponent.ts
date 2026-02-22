import path from "node:path";
import type { AgentComponent, AgentRunContext, ProfilePayload } from "../types.ts";
import { runPythonAgent } from "./PythonCliRunner.ts";

export class ProfileBuilderComponent implements AgentComponent<ProfilePayload> {
  readonly name = "profile_builder_agent";

  async run(ctx: AgentRunContext): Promise<ProfilePayload> {
    const scriptPath = path.join(ctx.agentsDir, "profile_builder_agent.py");
    return runPythonAgent<ProfilePayload>(ctx.pythonBin ?? "python", scriptPath, [
      "--identifier",
      ctx.identifier,
      "--data-root",
      ctx.dataRoot,
    ]);
  }
}
