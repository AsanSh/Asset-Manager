import { createRoot } from "react-dom/client";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "./api-client/custom-fetch";
import { getApiBase } from "./lib/api-base";
import { installChunkReloadHandler } from "./lib/chunk-reload";

setBaseUrl(getApiBase());
installChunkReloadHandler();

createRoot(document.getElementById("root")!).render(<App />);
