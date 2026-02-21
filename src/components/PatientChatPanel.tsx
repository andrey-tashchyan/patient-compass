import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { Patient } from "@/types/patient";
import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "assistant" | "system"; content: string };

interface Props {
  patient: Patient;
  updatePatient: UseMutationResult<Patient, Error, Patient, unknown>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-chat`;

export default function PatientChatPanel({ patient, updatePatient }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
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
          messages: history.map((m) => ({ role: m.role, content: m.content })),
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

          // Handle content
          if (delta.content) {
            assistantText += delta.content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantText } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantText }];
            });
          }

          // Handle tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) toolCalls[idx] = { name: "", args: "" };
              if (tc.function?.name) toolCalls[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
            }
          }
        } catch {
          // partial JSON, ignore
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
      // flush remaining
      if (buf.trim()) {
        for (const line of buf.split("\n")) {
          if (line.trim()) flush(line);
        }
      }

      // Process tool calls
      for (const tc of Object.values(toolCalls)) {
        try {
          const args = JSON.parse(tc.args);
          if (tc.name === "answer_question" && args.answer) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: args.answer } : m
                );
              }
              return [...prev, { role: "assistant", content: args.answer }];
            });
          } else if (tc.name === "modify_patient" && args.updated_patient) {
            updatePatient.mutate(args.updated_patient as Patient);
            const summary = args.summary || "Patient record updated.";
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: `✅ **Updated:** ${summary}` } : m
                );
              }
              return [...prev, { role: "assistant", content: `✅ **Updated:** ${summary}` }];
            });
          }
        } catch {
          // bad tool call args
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Failed to reach AI assistant");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, patient, updatePatient]);

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
                    Ask me anything about this patient, or instruct me to modify their records.
                  </p>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground/60">
                    <p>"What are the active diagnoses?"</p>
                    <p>"Add allergy to penicillin"</p>
                    <p>"Change metformin dosage to 1000mg"</p>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
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
              ))}

              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
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
                  placeholder="Ask about this patient…"
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
