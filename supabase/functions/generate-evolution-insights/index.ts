import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a clinical data analyst. Given a compact summary of a patient's vital signs, conditions, and treatments, generate structured annotations for a clinical evolution dashboard.

Return ONLY a JSON object with:
- annotations: array of { time (ISO date), metric (bp|hr|shock_index|condition), title (short), explanation (1-2 sentences), confidence (0-1), related_event_ids (string[]) }
- risk_windows: array of { start (ISO date), end (ISO date), label, confidence (0-1) }
- condition_trajectory: array of { condition, phase (onset|active|resolving|resolved), start (ISO date), end (ISO date), confidence (0-1) }
- plot_plan: an object describing which metrics to plot and in what order. You must analyze the data and decide which parameters are clinically most relevant for THIS specific patient. Consider:
  * Data availability: only recommend metrics that have data points
  * Clinical significance: prioritize metrics showing abnormal trends, crisis events, or correlations with conditions/treatments
  * Temporal patterns: if BP is the dominant story, lead with it; if HR correlates with a condition, highlight that
  
  The plot_plan must contain:
  - recommended_metrics: string[] — ordered list from ["sbp","dbp","map","hr","sbp_30d","annotations"] by clinical relevance
  - focus_metric: string — the single most important metric to emphasize visually (thicker line, area fill)
  - recommended_date_range: "30d"|"90d"|"365d"|"all" — the best time window to see the key clinical story
  - animation_sequence: array of { metric (string), delay_ms (number, multiples of 400 starting from 0), rationale (1 sentence explaining why this metric matters for this patient) }
  - narrative_headline: string — one sentence summarizing the dominant clinical narrative for this patient's evolution

Focus on clinically significant patterns: BP trends, medication timing effects, condition correlations. Be concise and evidence-based.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ annotations: [], risk_windows: [], condition_trajectory: [], source: "deterministic" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(body) },
        ],
        temperature: 0,
        tools: [
          {
            type: "function",
            function: {
              name: "return_insights",
              description: "Return clinical evolution insights with plot plan",
              parameters: {
                type: "object",
                properties: {
                  annotations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: { type: "string" },
                        metric: { type: "string" },
                        title: { type: "string" },
                        explanation: { type: "string" },
                        confidence: { type: "number" },
                        related_event_ids: { type: "array", items: { type: "string" } },
                      },
                      required: ["time", "metric", "title", "explanation", "confidence", "related_event_ids"],
                    },
                  },
                  risk_windows: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        start: { type: "string" },
                        end: { type: "string" },
                        label: { type: "string" },
                        confidence: { type: "number" },
                      },
                      required: ["start", "end", "label", "confidence"],
                    },
                  },
                  condition_trajectory: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        condition: { type: "string" },
                        phase: { type: "string" },
                        start: { type: "string" },
                        end: { type: "string" },
                        confidence: { type: "number" },
                      },
                      required: ["condition", "phase", "start", "end", "confidence"],
                    },
                  },
                  plot_plan: {
                    type: "object",
                    properties: {
                      recommended_metrics: {
                        type: "array",
                        items: { type: "string" },
                      },
                      focus_metric: { type: "string" },
                      recommended_date_range: {
                        type: "string",
                        enum: ["30d", "90d", "365d", "all"],
                      },
                      animation_sequence: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            metric: { type: "string" },
                            delay_ms: { type: "number" },
                            rationale: { type: "string" },
                          },
                          required: ["metric", "delay_ms", "rationale"],
                        },
                      },
                      narrative_headline: { type: "string" },
                    },
                    required: ["recommended_metrics", "focus_metric", "recommended_date_range", "animation_sequence", "narrative_headline"],
                  },
                },
                required: ["annotations", "risk_windows", "condition_trajectory", "plot_plan"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const txt = await aiResponse.text();
      console.error("AI gateway error:", status, txt);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ annotations: [], risk_windows: [], condition_trajectory: [], source: "deterministic" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ ...parsed, source: "ai" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ annotations: [], risk_windows: [], condition_trajectory: [], source: "deterministic" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-evolution-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
