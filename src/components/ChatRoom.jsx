import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import api from "../api.js";
import { userAuthDataStore } from "../store/userAuthDataStore.js";
import { userChatStore } from "../store/userChatStore.js";

function revealReplySlowly(text, onChange) {
  const characters = Array.from(text);
  const charactersPerStep = Math.max(1, Math.ceil(characters.length / 240));

  return new Promise(resolve => {
    if (characters.length === 0) {
      resolve();
      return;
    }

    let shown = 0;
    const timer = setInterval(() => {
      shown = Math.min(shown + charactersPerStep, characters.length);
      onChange(characters.slice(0, shown).join(""));

      if (shown === characters.length) {
        clearInterval(timer);
        resolve();
      }
    }, 25);
  });
}

function normalizeRole(message, fallbackRole) {
  const role = String(
    message?.role ?? message?.sender ?? message?.author ?? fallbackRole ?? "",
  ).toLowerCase();

  if (["user", "human", "user_input", "customer"].includes(role)) {
    return "user";
  }

  if (
    ["assistant", "ai", "bot", "model_output", "assistant_output"].includes(
      role,
    )
  ) {
    return "assistant";
  }

  return fallbackRole || "assistant";
}

function normalizeMessage(message, fallbackRole) {
  if (typeof message === "string") {
    return {
      role: fallbackRole || "assistant",
      content: message,
    };
  }

  return {
    ...message,
    role: normalizeRole(message, fallbackRole),
    content: message.content ?? message.text ?? message.message ?? "",
  };
}

export default function ChatRoom({
  chatId,
  onChatsChanged,
  onBusyChange,
  onUsageChange,
}) {
  const navigate = useNavigate();
  const conversationRef = useRef(null);
  const setUser = userAuthDataStore(state => state.setUser);
  const messages = userChatStore(state => state.messagesByChatId[chatId]);
  const setChatMessage = userChatStore(state => state.setChatMessage);

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [visibleReply, setVisibleReply] = useState(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const conversation = conversationRef.current;
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
    });
  }

  useEffect(() => {
    if (!chatId || messages !== undefined) return;
    let active = true;

    async function loadMessages() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/msg/${chatId}`);
        if (active) {
          const messages = response.data.messages;
          setChatMessage(
            chatId,
            messages.map(message => normalizeMessage(message)),
          );
          scrollToBottom();
        }
      } catch (error) {
        if (!active) return;
        if (error.response?.status === 401) {
          setUser(null);
        } else {
          setError("Could not load this chat. Please refresh.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMessages();
    return () => {
      active = false;
    };
  }, [chatId, messages, setChatMessage, setUser]);

  async function handleSend(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending || deletingId || (chatId && messages === undefined))
      return;

    setSending(true);
    onBusyChange(true);
    setError("");
    setPendingQuestion(content);
    setVisibleReply(null);
    setDraft("");
    scrollToBottom();

    try {
      const url = chatId ? `/msg/${chatId}` : "/msg";
      const body = { content };
      const response = await api.post(url, body);
      const savedChatId = response.data.chatId;

      onUsageChange({
        tokenUsed: response.data.usage.tokenUsed,
        tokenLimit: response.data.usage.tokenLimit,
      });
      setVisibleReply("");
      await revealReplySlowly(response.data.output, text => {
        setVisibleReply(text);
        scrollToBottom();
      });

      setChatMessage(savedChatId, [
        ...(messages || []),
        normalizeMessage(response.data.user_input, "user"),
        normalizeMessage(response.data.output, "assistant"),
      ]);
      setPendingQuestion(null);
      setVisibleReply(null);
      onChatsChanged();

      if (!chatId) navigate(`/chat/${savedChatId}`);
    } catch (error) {
      setPendingQuestion(null);
      setVisibleReply(null);
      setDraft(content);
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        setError(
          error.response?.data?.message ||
            "Message could not be sent. Try again.",
        );
      }
    } finally {
      setSending(false);
      onBusyChange(false);
    }
  }

  async function handleDeleteMessage(messageId) {
    if (
      !chatId ||
      !messages ||
      sending ||
      !window.confirm("Delete this message?")
    )
      return;

    setDeletingId(messageId);
    onBusyChange(true);
    setError("");

    try {
      await api.delete(`/msg/${chatId}/${messageId}`);
      setChatMessage(
        chatId,
        messages.filter(message => message._id !== messageId),
      );
      onChatsChanged();
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        setError(error.response?.data?.message || "Could not delete message.");
      }
    } finally {
      setDeletingId(null);
      onBusyChange(false);
    }
  }

  return (
    <>
      <section
        ref={conversationRef}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-5 overflow-y-auto px-4 py-8 sm:px-6"
        aria-label="Conversation"
      >
        {!chatId && !pendingQuestion && (
          <div className="flex flex-1 items-center justify-center">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-[#f4f4f4]">
              I'm locked in dude, what are we doing today ?
            </h2>
          </div>
        )}
        {loading && (
          <p className="text-sm text-[#a8a8a8]">Loading messages...</p>
        )}

        {chatId &&
          messages?.map((message, index) => {
            const normalizedMessage = normalizeMessage(message);
            const isUserMessage = normalizedMessage.role === "user";

            return (
              <div
                key={
                  normalizedMessage._id ?? `${normalizedMessage.role}-${index}`
                }
                className={`group w-fit max-w-[85%] break-words rounded-3xl px-4 py-3 ${
                  isUserMessage
                    ? "ml-auto bg-[#303030]"
                    : "mr-auto border border-white/10 bg-[#262626]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-4">
                  <p
                    className={`text-xs font-medium ${
                      isUserMessage ? "text-[#c8c8c8]" : "text-[#9f9f9f]"
                    }`}
                  >
                    {isUserMessage ? "You" : "Assistant"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(normalizedMessage._id)}
                    disabled={sending || Boolean(deletingId)}
                    aria-label={`Delete ${normalizedMessage.role} message`}
                    title="Delete message"
                    className="rounded p-1.5 text-[#a8a8a8] hover:bg-[#383838] hover:text-[#f87171] disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                    </svg>
                  </button>
                </div>
                <p className="whitespace-pre-wrap leading-7 text-[#ececec]">
                  {normalizedMessage.content}
                </p>
                {!isUserMessage && normalizedMessage.usage?.totalTokens > 0 && (
                  <p className="mt-2 text-xs text-[#8e8e8e]">
                    {normalizedMessage.usage.totalTokens} tokens used
                  </p>
                )}
              </div>
            );
          })}

        {pendingQuestion && (
          <div className="ml-auto w-fit max-w-[85%] break-words rounded-3xl bg-[#303030] px-4 py-3 whitespace-pre-wrap">
            <p className="mb-1 text-xs font-medium text-[#b4b4b4]">You</p>
            <p className="leading-7 text-[#ececec]">{pendingQuestion}</p>
          </div>
        )}

        {pendingQuestion && visibleReply === null && (
          <p role="status" className="text-sm text-[#a8a8a8]">
            Thinking...
          </p>
        )}

        {visibleReply !== null && (
          <div className="mr-auto w-fit max-w-[85%] break-words rounded-3xl border border-white/10 bg-[#262626] px-4 py-3 whitespace-pre-wrap">
            <p className="mb-1 text-xs font-medium text-[#9f9f9f]">Assistant</p>
            <p className="leading-7 text-[#ececec]">
              {visibleReply}
              <span className="animate-pulse text-[#a8a8a8]">▍</span>
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-[#f87171]">
            {error}
          </p>
        )}
      </section>

      <form
        onSubmit={handleSend}
        className="mx-4 mb-4 flex w-auto max-w-3xl shrink-0 items-end gap-2 rounded-[24px] border border-[#454545] bg-[#2b2b2b] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition focus-within:border-[#666] focus-within:ring-2 focus-within:ring-white/10 sm:mx-auto sm:w-full"
      >
        <textarea
          id="message"
          aria-label="Your message"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="Message the assistant..."
          rows={1}
          disabled={
            sending || Boolean(deletingId) || (chatId && messages === undefined)
          }
          className="max-h-40 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 text-[#ececec] outline-none placeholder:text-[#8e8e8e] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={
            !draft.trim() ||
            sending ||
            Boolean(deletingId) ||
            (chatId && messages === undefined)
          }
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl font-semibold text-[#212121] transition hover:scale-105 hover:bg-[#e5e5e5] disabled:scale-100 disabled:bg-[#686868] disabled:text-[#303030]"
        >
          ↑
        </button>
      </form>
    </>
  );
}
