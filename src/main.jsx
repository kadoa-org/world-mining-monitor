import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { parseRoute } from "./router";
import "./index.css";

const root = document.getElementById("root");
const element = document.getElementById("page-data");
const embedded = element ? JSON.parse(element.textContent) : null;
const route = parseRoute();
const initialPage = embedded?.route.name === route.name && embedded?.route.slug === route.slug ? embedded : null;
const app = <App initialPage={initialPage} />;

if (initialPage && root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
