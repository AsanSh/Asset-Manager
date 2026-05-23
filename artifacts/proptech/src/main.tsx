import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "./api-client/custom-fetch";
import { getApiBase } from "./lib/api-base";

setBaseUrl(getApiBase());

createRoot(document.getElementById("root")!).render(<App />);
