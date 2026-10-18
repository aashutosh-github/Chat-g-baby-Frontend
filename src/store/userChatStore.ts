import { create } from "zustand";

import type { ChatMessage } from "../types";

type UserChatStore = {
  messagesByChatId: Record<string, ChatMessage[]>;
  setChatMessage: (chatId: string, messages: ChatMessage[]) => void;
  removeChat: (chatId: string) => void;
  clearChat: () => void;
};

export const userChatStore = create<UserChatStore>(set => ({
  messagesByChatId: {},

  setChatMessage: (chatId, messages) =>
    set(state => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: messages,
      },
    })),

  removeChat: chatId =>
    set(state => {
      const messagesByChatId = { ...state.messagesByChatId };
      delete messagesByChatId[chatId];
      return messagesByChatId;
    }),

  clearChat: () => set({ messagesByChatId: {} }),
}));
