"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

type PanelTab = "chats" | "search" | "settings";

type Props = {
  userName: string;
  userEmail: string;
};

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ChatDashboard({ userName, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>("chats");
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => chat.title.toLowerCase().includes(query));
  }, [chats, search]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  useEffect(() => {
    async function loadChats() {
      setLoadingList(true);
      setError(null);

      try {
        const response = await fetch("/api/chats", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load chats.");
        const data = (await response.json()) as { chats: ChatSummary[] };
        const nextChats = data.chats ?? [];
        setChats(nextChats);

        if (nextChats.length > 0) {
          setActiveChatId(nextChats[0].id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load chats.");
      } finally {
        setLoadingList(false);
      }
    }

    void loadChats();
  }, []);

  useEffect(() => {
    async function loadChatMessages(chatId: string) {
      setLoadingMessages(true);
      setError(null);

      try {
        const response = await fetch(`/api/chats/${chatId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load chat messages.");

        const data = (await response.json()) as {
          chat: {
            messages: ChatMessage[];
          };
        };

        setMessages(data.chat.messages ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load chat.");
      } finally {
        setLoadingMessages(false);
      }
    }

    if (activeChatId) {
      void loadChatMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const threshold = 80; // px from bottom to consider 'at bottom'
    setShowScrollToBottom(distanceFromBottom > threshold);
  }, []);

  async function createNewChat() {
    setActiveTab("chats");
    setActiveChatId(null);
    setMessages([]);
    setPrompt("");
    setMobileMenuOpen(false);
  }

  async function deleteActiveChat() {
    if (!activeChatId) return;

    const response = await fetch(`/api/chats/${activeChatId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setError("Failed to delete chat.");
      return;
    }

    setChats((prev) => prev.filter((chat) => chat.id !== activeChatId));
    setMessages([]);

    const next = chats.find((chat) => chat.id !== activeChatId);
    setActiveChatId(next?.id ?? null);
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || sending) return;

    setSending(true);
    setError(null);
    setPrompt("");

    const optimisticMessage: ChatMessage = {
      role: "user",
      content: cleanPrompt,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chatId: activeChatId,
          prompt: cleanPrompt
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to send message.");
      }

      const data = (await response.json()) as {
        chat: ChatSummary;
        messages: ChatMessage[];
      };

      setMessages(data.messages ?? []);

      setChats((prev) => {
        const withoutCurrent = prev.filter((chat) => chat.id !== data.chat.id);
        return [data.chat, ...withoutCurrent];
      });

      setActiveChatId(data.chat.id);
      setActiveTab("chats");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="dashboard-wrap">
      <button
        type="button"
        className={mobileMenuOpen ? "mobile-menu-backdrop show" : "mobile-menu-backdrop"}
        aria-label="Close menu"
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside id="mobile-sidebar" className={mobileMenuOpen ? "sidebar mobile-open" : "sidebar"}>
        <div>
          <button
            type="button"
            className="mobile-close-menu-btn"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            ×
          </button>

          <h1 className="brand">Varity</h1>
          <p className="brand-sub">AI SaaS Workspace</p>

          <button type="button" className="new-chat-btn" onClick={createNewChat}>
            + New Chat
          </button>

          <nav className="sidebar-nav" aria-label="Primary">
            <button
              type="button"
              className={activeTab === "chats" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab("chats")}
            >
              Your Chats
            </button>
            <button
              type="button"
              className={activeTab === "search" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab("search")}
            >
              Search Chats
            </button>
            <button
              type="button"
              className={activeTab === "settings" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </nav>

          {(activeTab === "chats" || activeTab === "search") && (
            <div className="chat-list-wrap">
              {activeTab === "search" && (
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by chat title..."
                />
              )}

              <div className="chat-list">
                {(activeTab === "search" ? filteredChats : chats).map((chat) => (
                  <button
                    type="button"
                    key={chat.id}
                    className={chat.id === activeChatId ? "chat-item active" : "chat-item"}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span>{chat.title}</span>
                    <small>{new Date(chat.updatedAt).toLocaleDateString()}</small>
                  </button>
                ))}

                {!loadingList && chats.length === 0 && <p className="muted">No chats yet. Start one now.</p>}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <section className="settings-card">
              <h2>Workspace Settings</h2>
              <p>Model: {process.env.NEXT_PUBLIC_DEFAULT_MODEL ?? "Gemini Flash"}</p>
              <p>History: Saved to your account</p>
              <p>Theme: Dark professional</p>
            </section>
          )}
        </div>

        <div className="account-block">
          <div>
            <p className="account-name">{userName}</p>
            <p className="account-email">{userEmail}</p>
          </div>
          <button type="button" className="logout-btn" onClick={() => signOut({ callbackUrl: "/" })}>
            Log Out
          </button>
        </div>
      </aside>

      <section className="chat-main">
        <div className="mobile-chat-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-sidebar"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            ☰
          </button>

          {activeChat ? (
            <p className="mobile-chat-title">{activeChat.title}</p>
          ) : (
            <button type="button" className="mobile-new-chat-btn" onClick={createNewChat}>
              + New Chat
            </button>
          )}
        </div>

        <header className="chat-main-header">
          <div>
            <h2>{activeChat?.title ?? "New Conversation"}</h2>
            <p>
              {activeChat ? `Updated ${formatTime(activeChat.updatedAt)}` : "Start typing to create a saved chat."}
            </p>
          </div>
          {activeChatId && (
            <button type="button" className="danger-btn" onClick={deleteActiveChat}>
              Delete Chat
            </button>
          )}
        </header>

        <div
          className="messages-panel"
          aria-live="polite"
          onScroll={handleMessagesScroll}
          ref={messagesRef}
        >
          {loadingMessages ? (
            <p className="muted">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="muted">No messages yet. Ask anything to begin.</p>
          ) : (
            messages.map((message, index) => (
              <article
                key={`${message.createdAt}-${index}`}
                className={message.role === "user" ? "msg user" : "msg assistant"}
              >
                {message.role === "assistant" ? (
                  <div className="msg-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
              </article>
            ))
          )}

          {sending && (
            <article className="msg assistant typing-bubble" aria-label="Assistant is typing">
              <div className="typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="typing-text">Varity is thinking...</p>
            </article>
          )}
        </div>

        {showScrollToBottom && (
          <button
            type="button"
            className="scroll-to-bottom-btn"
            aria-label="Scroll to latest message"
            onClick={() => {
              const el = messagesRef.current;
              if (!el) return;
              el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              setShowScrollToBottom(false);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <form className="composer" onSubmit={onSend}>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Message Varity..."
            rows={3}
          />
          <button type="submit" disabled={sending || !prompt.trim()}>
            {sending ? "Thinking..." : "Send"}
          </button>
        </form>

        {error && <p className="page-error">{error}</p>}
      </section>
    </main>
  );
}
