import { FormEvent, useState } from "react";
import api from "../api/client";
import FormattedMessage from "../components/FormattedMessage";
import { usePdfStore } from "../store/pdfStore";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { filename: string; excerpt: string }[];
}

export default function ChatPage() {
  const selectedIds = usePdfStore((s) => s.selectedIds);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (selectedIds.length === 0) {
      setError("Select at least one PDF in the sidebar");
      return;
    }
    setError("");
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const { data } = await api.post<{
        answer: string;
        sources: { filename: string; excerpt: string }[];
      }>("/chat/message", { message: userMsg, pdf_ids: selectedIds });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to get response";
      setError(typeof detail === "string" ? detail : "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <h2>RAG Chat</h2>
        <p className="page-subtitle">
          Formal, structured answers from {selectedIds.length} selected PDF(s)
        </p>
      </header>
      <div className="page-body">
        <div className="chat-container card">
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">Ask a question about your selected PDFs</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-row chat-row-${msg.role}`}
              >
                <div className="chat-avatar">
                  {msg.role === "user" ? "You" : "AI"}
                </div>
                <div className={`message ${msg.role}`}>
                  {msg.role === "assistant" ? (
                    <FormattedMessage content={msg.content} />
                  ) : (
                    <p className="user-text">{msg.content}</p>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <details className="chat-sources">
                      <summary>Sources ({msg.sources.length})</summary>
                      <ul>
                        {msg.sources.map((s, j) => (
                          <li key={j}>
                            <strong>{s.filename}</strong>
                            <span className="source-excerpt">{s.excerpt}…</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-row chat-row-assistant">
                <div className="chat-avatar">AI</div>
                <div className="message assistant loading-msg">
                  <span className="spinner" /> Generating response…
                </div>
              </div>
            )}
          </div>
          {error && <p className="error-msg">{error}</p>}
          <form className="chat-input-row" onSubmit={send}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your documents…"
              rows={2}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
