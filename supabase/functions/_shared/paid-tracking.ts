/**
 * Shared Paid.ai usage tracking utility for all CliniVIEW edge functions.
 * Sends signals with event_name matching the Paid metric API key ("api_calls")
 * and external_product_id matching the Paid product ("cliniview_usage").
 */

const PAID_API_URL = "https://api.paid.ai/v1/signals";

/** Internal event names for CliniVIEW features (used in metadata only) */
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
  quantity?: number;
  data?: Record<string, unknown>;
}

/**
 * Send a usage signal to Paid.ai.
 * - event_name is ALWAYS "api_calls" to match the Paid metric API key.
 * - external_product_id is ALWAYS "cliniview_usage" to match the Paid product.
 * - quantity defaults to 1.
 * - The original eventName is passed in data.cliniview_event for internal tracking.
 * Fully awaited, with error isolation — never throws to caller.
 */
export async function trackUsage(input: TrackUsageInput): Promise<void> {
  const apiKey = Deno.env.get("PAID_API_KEY");
  if (!apiKey) {
    console.error("[trackUsage] PAID_API_KEY not set — skipping signal:", input.eventName);
    return;
  }

  const customerId = input.customerId || Deno.env.get("PAID_EXTERNAL_CUSTOMER_ID") || "demo_hospital";

  const signal = {
    event_name: "api_calls",                    // Must match Paid metric API key
    external_customer_id: customerId,
    external_product_id: "cliniview_usage",      // Must match Paid product external ID
    quantity: input.quantity ?? 1,
    data: {
      cliniview_event: input.eventName,          // Original event for internal analytics
      ...(input.data || {}),
    },
  };

  const body = { signals: [signal] };

  console.log("[trackUsage] PRE-SEND:", JSON.stringify(body));

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
      console.error(`[trackUsage] POST-SEND ERROR (${response.status}):`, responseText);
    } else {
      console.log(`[trackUsage] POST-SEND OK — cliniview_event=${input.eventName} customer=${customerId} — response: ${responseText}`);
    }
  } catch (err) {
    console.error("[trackUsage] Network error:", err);
  }
}
