import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { BrowserRouter } from "react-router-dom";

import GoogleAnalytics from "@/utils/GoogleAnalytics";

import "./assets/css/tailwind.css";

GoogleAnalytics.initialize(); // init GA4 property
    
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
