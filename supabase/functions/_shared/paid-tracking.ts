/**
 * Shared Paid.ai usage tracking utility for all CliniVIEW edge functions.
 * Uses raw fetch with the correct Paid API field names (matching the official SDK).
 */

const PAID_API_URL = "https://api.agentpaid.io/api/v1/usage/v2/signals/bulk";

/** Event names for all CliniVIEW features */
export type PaidEventName =
  | "consultation_generated"
  | "prescription_checked"
  | "contraindication_detected"
  | "red_flag_identified"
  | "pdf_structured"
  | "voice_dictation_processed";

export interface TrackUsageInput {
  eventName: PaidEventName;
  customerId?: string;
  agentId?: string;
  data?: Record<string, unknown>;
}

function agentIdForEvent(eventName: PaidEventName): string {
  switch (eventName) {
    case "consultation_generated":
    case "voice_dictation_processed":
      return "cliniview-dictation";
    case "prescription_checked":
    case "contraindication_detected":
    case "red_flag_identified":
      return "cliniview-safety";
    case "pdf_structured":
      return "cliniview-pdf";
  }
}

/**
 * Send a usage signal to Paid.ai.
 * Uses correct field names: customer_id, agent_id, event_name (matching PaidClient.usage.recordBulk format).
 * Fully awaited, with error isolation — never throws to caller.
 */
export async function trackUsage(input: TrackUsageInput): Promise<void> {
  const apiKey = Deno.env.get("PAID_API_KEY");
  if (!apiKey) {
    console.error("[trackUsage] PAID_API_KEY not set — skipping signal:", input.eventName);
    return;
  }

  const customerId = input.customerId || Deno.env.get("PAID_EXTERNAL_CUSTOMER_ID") || "demo_hospital";
  const agentId = input.agentId || agentIdForEvent(input.eventName);

  const signal = {
    event_name: input.eventName,
    external_customer_id: customerId,
    external_product_id: agentId,
    ...(input.data ? { data: input.data } : {}),
  };

  const body = { signals: [signal] };

  console.log("[trackUsage] Sending to Paid API:", JSON.stringify(body));

  try {
    const response = await fetch(PAID_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[trackUsage] Paid API error (${response.status}):`, responseText);
    } else {
      console.log(`[trackUsage] ✓ ${input.eventName} sent — customer=${customerId} agent=${agentId} — response: ${responseText}`);
    }
  } catch (err) {
    console.error("[trackUsage] Network error:", err);
  }
}
