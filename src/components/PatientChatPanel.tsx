import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User, Check, XCircle, Pill, Stethoscope, ShieldAlert, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { Patient } from "@/types/patient";
import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──

interface ProposedChange {
  category: string;
  action: "add" | "remove" | "update";
  description: string;
  data: Record<string, any>;
}

type MsgType = "text" | "proposal";

interface ChatMsg {
  role: "user" | "assistant";
  type: MsgType;
  content: string;
  // For proposals
  proposalId?: string;
  changes?: ProposedChange[];
  proposalStatus?: "pending" | "approved" | "rejected";
}

interface Props {
  patient: Patient;
  updatePatient: UseMutationResult<Patient, Error, Patient, unknown>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-chat`;

const CATEGORY_ICONS: Record<string, typeof Pill> = {
  medication: Pill,
  diagnosis: Stethoscope,
  allergy: ShieldAlert,
  clinical_note: FileText,
  lab_result: FileText,
  imaging: FileText,
  diagnostic_test: FileText,
  demographics: User,
};

const ACTION_COLORS: Record<string, string> = {
  add: "bg-emerald-500/10 text-emerald-600",
  remove: "bg-red-500/10 text-red-600",
  update: "bg-amber-500/10 text-amber-600",
};

// ── Apply Changes Logic ──

function applyChanges(patient: Patient, changes: ProposedChange[]): Patient {
  const updated = JSON.parse(JSON.stringify(patient)) as Patient;

  for (const change of changes) {
    if (change.category === "medication") {
      if (change.action === "add" && change.data.name) {
        updated.current_medications.push({
          name: change.data.name,
          dosage: change.data.dosage || "",
          frequency: change.data.frequency || "",
          indication: change.data.indication,
          prescribed_at: new Date().toISOString().split("T")[0],
        });
      } else if (change.action === "remove" && change.data.name) {
        updated.current_medications = updated.current_medications.filter(
          (m) => !m.name.toLowerCase().includes(change.data.name.toLowerCase())
        );
      } else if (change.action === "update" && change.data.name) {
        const med = updated.current_medications.find(
          (m) => m.name.toLowerCase().includes(change.data.name.toLowerCase())
        );
        if (med) {
          if (change.data.dosage || change.data.new_value) med.dosage = change.data.dosage || change.data.new_value || med.dosage;
          if (change.data.frequency) med.frequency = change.data.frequency;
        }
      }
    } else if (change.category === "diagnosis") {
      if (change.action === "add" && (change.data.condition || change.data.name)) {
        updated.diagnoses.push({
          condition: change.data.condition || change.data.name,
          icd_code: change.data.icd_code,
          status: (change.data.status as "active" | "resolved" | "chronic") || "active",
          date_diagnosed: new Date().toISOString().split("T")[0],
        });
      } else if (change.action === "remove" && (change.data.condition || change.data.name)) {
        const name = (change.data.condition || change.data.name).toLowerCase();
        const dx = updated.diagnoses.find((d) => d.condition.toLowerCase().includes(name));
        if (dx) dx.status = "resolved";
      } else if (change.action === "update" && (change.data.condition || change.data.name)) {
        const name = (change.data.condition || change.data.name).toLowerCase();
        const dx = updated.diagnoses.find((d) => d.condition.toLowerCase().includes(name));
        if (dx && change.data.status) {
          dx.status = change.data.status as "active" | "resolved" | "chronic";
        }
      }
    } else if (change.category === "lab_result") {
      if (change.action === "add" && change.data.test_name) {
        updated.lab_results.push({
          test_name: change.data.test_name,
          result: change.data.result || "",
          unit: change.data.unit || "",
          reference_range: change.data.reference_range || "",
          flagged: change.data.flagged,
          date_performed: change.data.date_performed || new Date().toISOString().split("T")[0],
        });
      } else if (change.action === "remove" && change.data.test_name) {
        const name = change.data.test_name.toLowerCase();
        updated.lab_results = updated.lab_results.filter(
          (l) => !l.test_name.toLowerCase().includes(name)
        );
      } else if (change.action === "update" && change.data.test_name) {
        const name = change.data.test_name.toLowerCase();
        const lab = updated.lab_results.find(
          (l) => l.test_name.toLowerCase().includes(name)
        );
        if (lab) {
          if (change.data.result || change.data.new_value) lab.result = change.data.result || change.data.new_value;
          if (change.data.unit) lab.unit = change.data.unit;
          if (change.data.reference_range) lab.reference_range = change.data.reference_range;
          if (change.data.flagged !== undefined) lab.flagged = change.data.flagged;
        }
      }
    } else if (change.category === "allergy") {
      if (change.action === "add" && (change.data.allergen || change.data.name)) {
        updated.allergies.push({
          allergen: change.data.allergen || change.data.name,
          reaction: change.data.reaction,
          recorded_at: new Date().toISOString().split("T")[0],
        });
      } else if (change.action === "remove" && (change.data.allergen || change.data.name)) {
        const name = (change.data.allergen || change.data.name).toLowerCase();
        updated.allergies = updated.allergies.filter(
          (a) => !a.allergen.toLowerCase().includes(name)
        );
      }
    }
  }

  return updated;
}

// ── Component ──

export default function PatientChatPanel({ patient, updatePatient }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const proposalCounter = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleApprove = useCallback((proposalId: string) => {
    const proposal = messages.find((m) => m.proposalId === proposalId && m.type === "proposal");
    if (!proposal?.changes) return;

    const updated = applyChanges(patient, proposal.changes);
    updatePatient.mutate(updated);

    setMessages((prev) => [
      ...prev.map((m) =>
        m.proposalId === proposalId ? { ...m, proposalStatus: "approved" as const } : m
      ),
      { role: "assistant", type: "text", content: "Changes applied to the patient record." },
    ]);
  }, [messages, patient, updatePatient]);

  const handleReject = useCallback((proposalId: string) => {
    setMessages((prev) => [
      ...prev.map((m) =>
        m.proposalId === proposalId ? { ...m, proposalStatus: "rejected" as const } : m
      ),
      { role: "assistant", type: "text", content: "Changes discarded." },
    ]);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { role: "user", type: "text", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.type === "text")
            .map((m) => ({ role: m.role, content: m.content })),
          patientData: patient,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast.error(err.error || "AI request failed");
        setLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error("No response stream");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";
      let toolCalls: Record<number, { name: string; args: string }> = {};

      const flush = (line: string) => {
        if (!line.startsWith("data: ")) return;
        const json = line.slice(6).trim();
        if (json === "[DONE]") return;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) return;

          if (delta.content) {
            assistantText += delta.content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.type === "text") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantText } : m
                );
              }
              return [...prev, { role: "assistant", type: "text", content: assistantText }];
            });
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) toolCalls[idx] = { name: "", args: "" };
              if (tc.function?.name) toolCalls[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
            }
          }
        } catch (err) {
          console.warn("SSE parse error:", err, "line:", json);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.trim()) flush(line);
        }
      }
      if (buf.trim()) {
        for (const line of buf.split("\n")) {
          if (line.trim()) flush(line);
        }
      }

      // Process tool calls — if none, and no text streamed, show error
      const hasToolCalls = Object.keys(toolCalls).length > 0;
      if (!hasToolCalls && !assistantText.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", type: "text", content: "Sorry, I couldn't process that request. Please try again." },
        ]);
      }
      for (const tc of Object.values(toolCalls)) {
        try {
          const args = JSON.parse(tc.args);

          if (tc.name === "answer_question" && args.answer) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.type === "text") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: args.answer } : m
                );
              }
              return [...prev, { role: "assistant", type: "text", content: args.answer }];
            });
          } else if (tc.name === "propose_modification" && args.proposed_changes) {
            const id = `proposal-${++proposalCounter.current}`;
            setMessages((prev) => {
              // Remove streaming text placeholder if it was empty
              const cleaned = prev.filter((m, i) =>
                !(i === prev.length - 1 && m.role === "assistant" && m.type === "text" && !m.content.trim())
              );
              return [
                ...cleaned,
                {
                  role: "assistant",
                  type: "text",
                  content: args.summary || "I'd like to make the following changes:",
                },
                {
                  role: "assistant",
                  type: "proposal",
                  content: "",
                  proposalId: id,
                  changes: args.proposed_changes,
                  proposalStatus: "pending",
                },
              ];
            });
          }
        } catch (err) {
          console.error("Tool call parse error:", err, "raw args:", tc.args);
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Failed to reach AI assistant");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, patient]);

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg"
              onClick={() => setOpen(true)}
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[520px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm text-foreground">AI Assistant</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Bot className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about this patient, or ask me to propose record changes.
                  </p>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground/60">
                    <p>"What are the active diagnoses?"</p>
                    <p>"Add allergy to penicillin"</p>
                    <p>"Change metformin dosage to 1000mg"</p>
                  </div>
                </div>
              )}

              {messages.map((m, i) => {
                // Proposal card
                if (m.type === "proposal" && m.changes) {
                  const isPending = m.proposalStatus === "pending";
                  const isApproved = m.proposalStatus === "approved";
                  const isRejected = m.proposalStatus === "rejected";

                  return (
                    <div key={i} className="mb-3 flex gap-2 justify-start">
                      <div className="shrink-0 mt-0.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <div className="max-w-[85%] rounded-xl border border-border bg-muted/30 overflow-hidden">
                        {/* Change list */}
                        <div className="px-3 py-2 space-y-2">
                          {m.changes.map((change, ci) => {
                            const Icon = CATEGORY_ICONS[change.category] || FileText;
                            return (
                              <div key={ci} className="flex items-start gap-2 text-sm">
                                <div className="p-1 rounded bg-muted shrink-0 mt-0.5">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded ${ACTION_COLORS[change.action] || ""}`}>
                                      {change.action}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                      {change.category.replace("_", " ")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-foreground mt-0.5">{change.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Action buttons */}
                        <div className="border-t border-border px-3 py-2 flex items-center gap-2">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1 flex-1"
                                onClick={() => handleApprove(m.proposalId!)}
                              >
                                <Check className="h-3 w-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1 flex-1 text-muted-foreground"
                                onClick={() => handleReject(m.proposalId!)}
                              >
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            </>
                          )}
                          {isApproved && (
                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Approved and applied
                            </p>
                          )}
                          {isRejected && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Rejected
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Regular text message
                return (
                  <div key={i} className={`mb-3 flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="shrink-0 mt-0.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                    {m.role === "user" && (
                      <div className="shrink-0 mt-0.5">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}

              <div ref={bottomRef} />
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border px-3 py-2.5 bg-muted/20">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask about this patient..."
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  disabled={loading}
                />
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
