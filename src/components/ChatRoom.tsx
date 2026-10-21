import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import api from "../api.js";
import { userAuthDataStore } from "../store/userAuthDataStore.js";
import { userChatStore } from "../store/userChatStore.js";

import type { Dispatch, SetStateAction } from "react";
import type { SubmitEvent } from "react";
import type { ChatMessage, Usage } from "../types.js";

type ReturnedMessagesFromBackend = {
  userId: string;
  chatId: string;
  role: "user_input" | "model_output" | "user" | "assistant";
  content: string;
  tokens: number;
  totalTokens: number;
};

type ChatRoomTypes = {
  chatId?: string;
  onChatsChanged: () => void;
  onBusyChange: Dispatch<SetStateAction<boolean>>;
  onUsageChange: Dispatch<SetStateAction<Usage | null>>;
};

type Role = "user" | "assistant";
type MessageInput = ChatMessage | ReturnedMessagesFromBackend | string;

function revealReplySlowly(text: string, onChange: (content: string) => void) {
  const characters = Array.from(text);
  const charactersPerStep = Math.max(1, Math.ceil(characters.length / 240));

  return new Promise<void>(resolve => {
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

function normalizeRole(message: { role?: string }, fallbackRole: Role): Role {
  const role = message?.role?.toLowerCase();

  if (role === "user" || role === "user_input") {
    return "user";
  }

  if (role === "assistant" || role === "model_output") {
    return "assistant";
  }

  return fallbackRole;
}

function normalizeMessage(
  message: MessageInput,
  fallbackRole: Role = "assistant",
): ChatMessage {
  if (typeof message === "string") {
    return {
      role: fallbackRole,
      content: message,
    };
  }

  return {
    ...message,
    role: normalizeRole(message, fallbackRole),
    content: message.content,
  };
}

export default function ChatRoom({
  chatId,
  onChatsChanged,
  onBusyChange,
  onUsageChange,
}: ChatRoomTypes) {
  const navigate = useNavigate();
  const conversationRef = useRef<HTMLElement | null>(null);
  const setUser = userAuthDataStore(state => state.setUser);
  const messages = userChatStore(state =>
    chatId ? state.messagesByChatId[chatId] : undefined,
  );
  const setChatMessage = userChatStore(state => state.setChatMessage);

  const [draft, setDraft] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [visibleReply, setVisibleReply] = useState<string | null>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const conversation = conversationRef.current;
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
    });
  }

  useEffect(() => {
    if (typeof chatId !== "string" || messages !== undefined) return;
    let active = true;

    async function loadMessages() {
      setLoading(true);
      setError("");

      try {
        if (!chatId) throw new Error(`Chat ID is missing`);
        const response = await api.get(`/msg/${chatId}`);
        if (active) {
          const messages: ReturnedMessagesFromBackend[] =
            response.data.messages;
          setChatMessage(
            chatId,
            messages.map(message => normalizeMessage(message, "assistant")),
          );
          scrollToBottom();
        }
      } catch (error) {
        if (!active) return;
        const status = axios.isAxiosError(error) ? error.response?.status : 500;
        if (status === 401) {
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

  async function handleSend(event: SubmitEvent<HTMLFormElement>) {
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
      const status = axios.isAxiosError(error) ? error.response?.status : 500;
      if (status === 401) {
        setUser(null);
      } else {
        const message = axios.isAxiosError(error)
          ? error.response?.data.message
          : `Message could not be sent. Try again.`;
        setError(message);
      }
    } finally {
      setSending(false);
      onBusyChange(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
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
      const status = axios.isAxiosError(error) ? error.response?.status : 500;
      if (status === 401) {
        setUser(null);
      } else {
        const message = axios.isAxiosError(error)
          ? error.response?.data.message
          : `Message could not be sent. Try again.`;
        setError(message);
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
                className={`group w-fit max-w-[85%] wrap-break-word rounded-3xl px-4 py-3 ${
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
                    onClick={() =>
                      handleDeleteMessage(normalizedMessage?._id ?? "")
                    }
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
                {!isUserMessage &&
                  (normalizedMessage.usage?.totalTokens ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-[#8e8e8e]">
                      {normalizedMessage?.usage?.totalTokens} tokens used
                    </p>
                  )}
              </div>
            );
          })}

        {pendingQuestion && (
          <div className="ml-auto w-fit max-w-[85%] wrap-break-word rounded-3xl bg-[#303030] px-4 py-3 whitespace-pre-wrap">
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
          <div className="mr-auto w-fit max-w-[85%] wrap-break-word rounded-3xl border border-white/10 bg-[#262626] px-4 py-3 whitespace-pre-wrap">
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
        className="mx-4 mb-4 flex w-auto max-w-3xl shrink-0 items-end gap-2 rounded-3xl border border-[#454545] bg-[#2b2b2b] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition focus-within:border-[#666] focus-within:ring-2 focus-within:ring-white/10 sm:mx-auto sm:w-full"
      >
        <textarea
          id="message"
          aria-label="Your message"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="Message the assistant..."
          rows={1}
          disabled={
            sending ||
            Boolean(deletingId) ||
            Boolean(chatId && messages === undefined)
          }
          className="max-h-40 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 text-[#ececec] outline-none placeholder:text-[#8e8e8e] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={
            !draft.trim() ||
            sending ||
            Boolean(deletingId) ||
            Boolean(chatId && messages === undefined)
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
