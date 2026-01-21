import { applyTheme } from "./lib/theme.js";
import { getRoute } from "./lib/router.js";
import { renderEditor } from "./pages/editor.js";
import { renderUpgrade } from "./pages/upgrade.js";
import { renderPrivacy } from "./pages/privacy.js";

const appEl = document.querySelector("#app");
const isWidget = !!window.openai?.callTool;

applyTheme({ isWidget });

const route = getRoute({ isWidget });
if (route.name === "privacy") renderPrivacy({ appEl });

if (route.name === "upgrade") {
  renderUpgrade({ appEl });
} else {
  renderEditor({
    appEl,
    isWidget,
    initialToolOutput: window.openai?.toolOutput ?? {},
  });
}
