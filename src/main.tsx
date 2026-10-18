import { createRoot } from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found");
}

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
