

# Fix: Paid.ai Not Receiving Signals

## Root Cause

The `trackUsage()` function in `structure-dictation` has **no success-path logging**. It only logs on error (`console.error`) and on missing key (`console.warn`). Since edge function logs show none of these, one of two things is happening:

1. `PAID_API_KEY` is not set in Supabase secrets (the `console.warn` may not appear in filtered logs), causing the function to silently return at line 14-16.
2. The Paid API call succeeds (HTTP 200) but the payload format or API key value is incorrect, so Paid ignores the signal.

Additionally, there is **no way to distinguish these cases** without adding debug logging.

## Plan

### Step 1: Add debug logging to trackUsage (edge function)

**File:** `supabase/functions/structure-dictation/index.ts`

Add `console.log` statements to confirm:
- Whether PAID_API_KEY is present (log its length, not value)
- The request URL and payload shape
- The Paid API response status and body

```typescript
async function trackUsage(input: { ... }) {
  if (!PAID_API_KEY) {
    console.error("[trackUsage] PAID_API_KEY is NOT set. Skipping.");
    return;
  }
  console.log("[trackUsage] PAID_API_KEY present, length:", PAID_API_KEY.length);

  const body = { signals: [{ ... }] };
  console.log("[trackUsage] Sending to Paid:", JSON.stringify(body));

  const response = await fetch(PAID_USAGE_URL, { ... });
  const responseText = await response.text();
  console.log("[trackUsage] Paid response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Paid usage tracking failed (${response.status}): ${responseText}`);
  }
}
```

Also add a log at the call site (line 786-796) to confirm execution reaches trackUsage:

```typescript
console.log("[structure-dictation] About to call trackUsage...");
try {
  await trackUsage({ ... });
  console.log("[structure-dictation] trackUsage completed successfully.");
} catch (trackError) {
  console.error("Paid usage tracking failed:", trackError);
}
```

### Step 2: Redeploy and test

- Deploy the updated edge function
- Call it via curl tool to trigger execution
- Read logs to see exact debug output
- Determine whether the issue is missing API key, wrong endpoint, or wrong payload

### Step 3: Fix based on findings

If `PAID_API_KEY` is missing or empty: verify secret is set correctly.
If Paid API returns error: fix URL or payload format.
If Paid API returns 200 but no signals: check with Paid.ai documentation for correct payload structure.

### Step 4: No frontend changes needed

The frontend invocation chain is correct:
- Uses `VITE_SUPABASE_URL` (production URL)
- Sends proper `apikey` and `Authorization` headers
- Calls the right endpoint path

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/structure-dictation/index.ts` | Add debug logging to `trackUsage()` and its call site |

## Verification Checklist

1. Deploy updated function
2. Call function via test tool
3. Check logs for `[trackUsage]` messages
4. Confirm PAID_API_KEY presence and length
5. Confirm Paid API response status
6. Check Paid dashboard for received signal
7. Remove debug logs once root cause is confirmed and fixed

