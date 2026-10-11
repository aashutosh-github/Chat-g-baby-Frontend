import { create } from "zustand";

export const userChatStore = create(set => ({
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
