import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
const app = <App />;

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
