import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";
import axios from "axios";

// Rewrite localhost:8000 to the current browser's hostname dynamically
const backendHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'localhost:8000'
  : `${window.location.hostname}:8000`;

axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes('localhost:8000')) {
    config.url = config.url.replace('localhost:8000', backendHost);
  }
  return config;
}, (error) => Promise.reject(error));

const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.includes('localhost:8000')) {
    url = url.replace('localhost:8000', backendHost);
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
