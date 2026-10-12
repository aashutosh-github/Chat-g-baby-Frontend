import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { userAuthDataStore } from "../store/userAuthDataStore.js";
import { userChatStore } from "../store/userChatStore.js";
import api from "../api.js";
import ChatSidebar from "../components/ChatSidebar.jsx";
import ChatRoom from "../components/ChatRoom.jsx";

function Home() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const user = userAuthDataStore(state => state.user);
  const setUser = userAuthDataStore(state => state.setUser);
  const clearChat = userChatStore(state => state.clearChat);

  const [status, setStatus] = useState(user ? "ready" : "loading");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logOutError, setLogOutError] = useState("");
  const [refreshChats, setRefreshChats] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageError, setUsageError] = useState("");

  useEffect(() => {
    async function loadHome() {
      try {
        const response = await api.get("/user/profile");
        const { name, age, email, usage } = response.data;
        setUser({ name, age, email });
        setUsage(usage);
        setStatus("ready");
      } catch (error) {
        setStatus(error.response?.status === 401 ? "logged-out" : "error");
        return;
      }
    }

    loadHome();
  }, [setUser]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogOutError("");

    try {
      await api.post("/user/logout");
    } catch (error) {
      if (error.response?.status !== 401) {
        setLogOutError("Could not log out. Please try again.");
        setIsLoggingOut(false);
        return;
      }
    }

    setStatus("logging-out");
    clearChat();
    setUser(null);
    navigate("/login", { replace: true });
  }

  if (status === "loading") {
    return (
      <p className="min-h-dvh bg-[#212121] p-8 text-[#b4b4b4]">
        Checking your session...
      </p>
    );
  }
  if (status === "logging-out") {
    return (
      <p className="min-h-dvh bg-[#212121] p-8 text-[#b4b4b4]">
        Logging out...
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="min-h-dvh bg-[#212121] p-8 text-[#f87171]">
        Could not check your session. Please refresh.
      </p>
    );
  }
  if (status === "logged-out" || !user) {
    return <Navigate to="/signup" replace />;
  }

  function refreshSidebar() {
    setRefreshChats(count => count + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#212121] text-[#ececec] md:h-dvh md:flex-row">
      <ChatSidebar
        chatId={chatId}
        refreshChats={refreshChats}
        onChatsChanged={refreshSidebar}
        busy={chatBusy}
        onBusyChange={setChatBusy}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Chat-g-Baby
            </h1>
            <p className="text-xs text-[#a8a8a8]">Yo, {user.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-full border border-[#424242] bg-[#2b2b2b] px-3 py-1.5 text-xs text-[#d4d4d4]">
              {usage
                ? `Current usage: ${Number(usage.tokenUsed ?? 0).toLocaleString()} / ${Number(usage.tokenLimit ?? 0).toLocaleString()} tokens`
                : usageError || "Loading usage..."}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut || chatBusy}
              className="rounded-full px-3 py-1.5 text-sm text-[#b4b4b4] hover:bg-[#303030] hover:text-white disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </header>
        {logOutError && (
          <p role="alert" className="px-5 py-2 text-sm text-[#f87171]">
            {logOutError}
          </p>
        )}

        <ChatRoom
          key={chatId || "new"}
          chatId={chatId}
          onChatsChanged={refreshSidebar}
          onBusyChange={setChatBusy}
          onUsageChange={setUsage}
        />
      </div>
    </main>
  );
}

export default Home;
