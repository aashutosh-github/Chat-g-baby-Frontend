import { useEffect } from "react";
import { useState } from "react";
import { Navigate } from "react-router";
import api from "../api.js";

function Home() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await api.get("/users/profile");
        setUser(response.data);
        setStatus("logged-in");
      } catch (error) {
        if (error.response?.status === 401) {
          setStatus("logged-out");
        } else {
          setStatus("error");
        }
      }
    }

    checkSession();
  }, []);

  if (status === "loading") {
    return <h1 className="text-gray-700">Your session is loading</h1>;
  }

  if (status === "logged-out") {
    return <Navigate to="/signup" replace></Navigate>;
  }

  if (status === "error") {
    return <p className="text-gray-700">Refresh the page again</p>;
  }

  return (
    <>
      <h1>Welcome to chat-g-baby</h1>
      <p>Hello, {user.name}</p>
    </>
  );
}

export default Home;
