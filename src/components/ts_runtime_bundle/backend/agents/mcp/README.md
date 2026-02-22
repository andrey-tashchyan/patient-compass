# Patient Evolution MCP Plugin (TypeScript)

This module mirrors the Python agentic workflow in `backend/agents` by exposing one TypeScript plugin that composes five TS agent components:

- `IdentityAgentComponent`
- `ProfileBuilderComponent`
- `TemporalEvolutionComponent`
- `ContextFusionComponent`
- `NarrativeComponent`

Each TS component calls the corresponding Python agent CLI and returns typed JSON.

## Usage

```ts
import { PatientEvolutionPlugin } from "./backend/agents/mcp";

const plugin = new PatientEvolutionPlugin({
  dataRoot: "data",
  pythonBin: "python",
  agentsDir: "backend/agents",
});

const result = await plugin.run("<patient_uuid_or_id_or_mrn>");
console.log(result.metadata.source_counts);
```

## CLI

Run with Node directly:

```bash
node backend/scripts/run_patient_evolution_mcp.js --identifier <patient_uuid_or_id_or_mrn>
```

Write to file:

```bash
node backend/scripts/run_patient_evolution_mcp.js --identifier <id> --output data/exports/<id>_patient_evolution_mcp.json
```

## Output

`plugin.run(...)` returns:

- `patient`
- `timeline`
- `episodes`
- `alerts`
- `identity`
- `narrative`
- `metadata`

matching the workflow shape produced by the Python orchestrator.
