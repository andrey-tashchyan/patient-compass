/**
 * Shared Paid.ai usage tracking utility for all CliniVIEW edge functions.
 * Sends usage signals to the Paid API for billing and safety analytics.
 */

const PAID_API_KEY = Deno.env.get("PAID_API_KEY");
const PAID_USAGE_URL = "https://api.agentpaid.io/api/v1/usage/v2/signals/bulk";
const PAID_EXTERNAL_CUSTOMER_ID = Deno.env.get("PAID_EXTERNAL_CUSTOMER_ID") || "demo_hospital";

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
  externalCustomerId?: string;
  externalProductId?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a usage signal to Paid.ai.
 * Fully awaited, with error isolation — never throws to caller.
 */
export async function trackUsage(input: TrackUsageInput): Promise<void> {
  if (!PAID_API_KEY) {
    console.warn("[trackUsage] PAID_API_KEY not set — skipping signal:", input.eventName);
    return;
  }

  const body = {
    signals: [
      {
        event_name: input.eventName,
        external_customer_id: input.externalCustomerId || PAID_EXTERNAL_CUSTOMER_ID,
        external_product_id: input.externalProductId || productIdForEvent(input.eventName),
        ...(input.data ? { data: input.data } : {}),
      },
    ],
  };

  try {
    const response = await fetch(PAID_USAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAID_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[trackUsage] Paid API error (${response.status}):`, responseText);
    } else {
      console.log(`[trackUsage] ✓ ${input.eventName} signal sent`);
    }
  } catch (err) {
    console.error("[trackUsage] Network error:", err);
  }
}

function productIdForEvent(eventName: PaidEventName): string {
  switch (eventName) {
    case "consultation_generated":
    case "voice_dictation_processed":
      return "cliniview-dictation";
    case "prescription_checked":
    case "contraindication_detected":
      return "cliniview-safety";
    case "red_flag_identified":
      return "cliniview-safety";
    case "pdf_structured":
      return "cliniview-pdf";
  }
}
