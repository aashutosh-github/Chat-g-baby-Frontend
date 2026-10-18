export type User = {
  name: string;
  age?: number;
  email: string;
};

export type Usage = {
  tokenUsed: number;
  tokenLimit: number;
};

export type BackendResponseChatMessage = {
  _id?: string;
  role: "user_input" | "model_output";
  content: string;
  usage?: {
    totalTokens?: number;
  };
};

export type ChatMessage = {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  usage?: {
    totalTokens: number;
  };
};
