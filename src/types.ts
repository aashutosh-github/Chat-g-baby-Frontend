export type User = {
  name: string;
  age?: number;
  email: string;
};

export type Usage = {
  tokenUsed: number;
  tokenLimit: number;
};

export type ChatMessage = {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  usage?: {
    totalTokens: number;
  };
};
