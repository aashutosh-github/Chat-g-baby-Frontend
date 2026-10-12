import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { userAuthDataStore } from "../store/userAuthDataStore.js";
import { userChatStore } from "../store/userChatStore.js";
import api from "../api.js";

function Home() {
  const chatId = useParams();
  const navigate = useNavigate();
  const user = userAuthDataStore(state => state.user);
  const setUser = userAuthDataStore(state => state.setUser);
  const clearChat = userChatStore(state => state.clearChat);

  const [status, setStatus] = useState(user ? "ready" : "loading");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logOutError, setLogOutError] = useState("");

  useEffect(() => {
    async function loadHome() {
      try {
        const response = await api("/user/profile");
        const { name, age, email, usage } = response.data;
        setUser({ name, age, email, usage });
        setStatus("ready");
      } catch (err) {
        setStatus(err.response?.status === 401 ? "logged-out" : "error");
        return;
      }
    }

    loadHome();
  }, []);

  async function handleLogOut() {
    setIsLoggingOut(true);
    try {
      await api.post("/user/logout");
    } catch (err) {
      if (err.response?.status !== 401) {
        setLogOutError("Error: could not logout, please try again");
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
    return <h1 className="text-gray-300">Your session is loading</h1>;
  }

  if (status === "logging-out") {
    return <h1 className="text-gray-300">Logging out</h1>;
  }

  if (status === "logged-out" || !user) {
    return <Navigate to="/signup" replace></Navigate>;
  }

  if (status === "error") {
    return <p className="text-gray-300">Please refresh the page again</p>;
  }

  return (
    <>
      <h1 className="text-2xl text-gray-200 underline ml-2 mt-2 mb-2">
        Welcome to chat-g-baby
      </h1>
      <p className="text-xl text-gray-200 mt-2 ml-2">Hello, {user.name}</p>
      <button
        onClick={handleLogOut}
        className="text-xl text-gray-300 underline ml-4 hover:cursor-pointer"
      >
        Logout
      </button>
    </>
  );
}

export default Home;
