import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";
import { installLinkInterceptor, upgradeLegacyHashUrl } from "./utils/router.js";

upgradeLegacyHashUrl();
installLinkInterceptor();

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
