import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./state/authStore.jsx";
import { ContentProvider } from "./state/contentStore.jsx";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ContentProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ContentProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

