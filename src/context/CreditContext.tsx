import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface CreditState {
  total: number;
  used: number;
  remaining: number;
  planName: string;
}

interface CreditContextValue extends CreditState {
  consumeCredit: (action: string) => boolean;
  refillCredits: () => void;
  hasCredits: boolean;
}

const STORAGE_KEY = "cliniview_credits";
const DEFAULT_TOTAL = 100;

function loadCredits(): CreditState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { total: DEFAULT_TOTAL, used: 0, remaining: DEFAULT_TOTAL, planName: "Pro Trial" };
}

function saveCredits(state: CreditState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const CreditContext = createContext<CreditContextValue | null>(null);

export function CreditProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreditState>(loadCredits);

  useEffect(() => {
    saveCredits(state);
  }, [state]);

  const consumeCredit = useCallback((action: string) => {
    let consumed = false;
    setState((prev) => {
      if (prev.remaining <= 0) return prev;
      consumed = true;
      const next = { ...prev, used: prev.used + 1, remaining: prev.remaining - 1 };
      console.log(`[Paid] Credit consumed: ${action} | remaining=${next.remaining}`);
      return next;
    });
    return consumed;
  }, []);

  const refillCredits = useCallback(() => {
    setState({ total: DEFAULT_TOTAL, used: 0, remaining: DEFAULT_TOTAL, planName: "Pro Trial" });
  }, []);

  return (
    <CreditContext.Provider
      value={{ ...state, consumeCredit, refillCredits, hasCredits: state.remaining > 0 }}
    >
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error("useCredits must be used within CreditProvider");
  return ctx;
}
