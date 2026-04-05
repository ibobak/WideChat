// Use the cross-browser extension API (Firefox uses `browser`, Chrome uses `chrome`)
const browser = globalThis.browser || globalThis.chrome;

const DEFAULT_WIDTH = 100;

const loadSettings = () => {
  return browser.storage.local.get("width").then(
    (r) => r.width || DEFAULT_WIDTH
  ).catch(
    () => DEFAULT_WIDTH
  );
};

// Inject or update a <style> element in the page's <head>.
// Reuses an existing element with the same `id` to avoid duplicates.
const attachStyle = (aCss) => {
  const id = "widechat-style";
  let style = document.getElementById(id);
  if (!style) {
    style = document.head.appendChild(Object.assign(document.createElement("style"), { id }));
  }
  style.textContent = aCss;
};

// Detect which LLM chat site the content script is running on
const isChatGPT = window.location.hostname.endsWith("chatgpt.com");
const isClaude = window.location.hostname.endsWith("claude.ai");
const isGemini = window.location.hostname.endsWith("gemini.google.com");
const isGrok = window.location.hostname.endsWith("grok.com");
const isQwen = window.location.hostname.endsWith("qwen.ai");
const isDeepSeek = window.location.hostname.endsWith("deepseek.com");
const isKimi = window.location.hostname.endsWith("kimi.com");

// --- Per-site CSS generators ---
// Each function returns CSS that overrides the site's max-width constraints
// so the chat thread and input area expand to the user-chosen width percentage.



// ChatGPT: overrides the --thread-content-max-width CSS variable that controls
// both the conversation thread and composer width, and reduces side margins.
const getChatGPTCss = (aWidth) => `
    /* Ensure sticky header has a solid background so content doesn't show through */
    header.sticky {
        background-color: var(--main-surface-primary, #ffffff) !important;
    }

    /* Override thread width variable and max-width at every breakpoint */
    div[class*="--thread-content-max-width"] {
        --thread-content-max-width: ${aWidth}% !important;
        max-width: ${aWidth}% !important;
    }

    /* Reduce side margins (including responsive sub-variables) */
    div[class*="--thread-content-margin"] {
        --thread-content-margin: 16px !important;
        --thread-content-margin-xs: 16px !important;
        --thread-content-margin-sm: 16px !important;
        --thread-content-margin-lg: 16px !important;
    }

    /* Cap user message bubble so it doesn't stretch across the full thread */
    [class*="user-message-bubble"] {
        --user-chat-width: 48rem !important;
    }

    /* Keep table containers within the content area */
    div[class*='tableContainer'] {
        --thread-gutter-size: 0px !important;
        max-width: 100% !important;
        width: 100% !important;
    }

    div[class*='tableWrapper'] {
        min-width: fit-content !important;
        max-width: 100% !important;
    }
`;

// Claude.ai: widens conversation thread, new-chat page, composer, and message bubbles.
const getClaudeCss = (aWidth) => `
    /* Conversation thread area */
    .max-w-3xl {
        max-width: ${aWidth}% !important;
    }

    /* New chat page content and composer */
    .max-w-2xl {
        max-width: ${aWidth}% !important;
    }

    /* Outer main container on new chat page */
    main.max-w-7xl {
        max-width: ${aWidth}% !important;
    }

    /* User message bubbles */
    .max-w-\\[75ch\\] {
        max-width: ${aWidth}% !important;
    }
    .max-w-\\[85\\%\\] {
        max-width: ${aWidth}% !important;
    }
`;

// Gemini: widens conversation, query bubbles, input area, and landing page.
const getGeminiCss = (aWidth) => `
    /* Conversation thread container */
    .conversation-container {
        max-width: ${aWidth}% !important;
    }

    /* User query area */
    user-query {
        max-width: ${aWidth}% !important;
    }

    /* User message bubble */
    .user-query-bubble-with-background {
        max-width: ${aWidth}% !important;
    }

    /* Input area */
    .input-area-container {
        max-width: ${aWidth}% !important;
    }

    /* New chat landing page */
    .center-section {
        max-width: ${aWidth}% !important;
    }

    .landing-page-wrapper {
        max-width: ${aWidth}% !important;
    }

    /* Disclaimer text */
    hallucination-disclaimer {
        max-width: ${aWidth}% !important;
    }
`;

// Grok: widens the thread container and input bar without widening individual
// message rows.  Message rows use max-w-[var(--content-max-width)] which keeps
// them at the original 48rem so user/assistant alignment stays tight.
const getGrokCss = (aWidth) => `
    /* Widen the conversation thread container */
    .max-w-\\[--content-max-width\\] {
        max-width: ${aWidth}% !important;
    }

    /* Widen the input bar and new-chat landing page */
    .max-w-breakout,
    .query-bar {
        max-width: ${aWidth}% !important;
    }
`;

// Qwen: widens message containers, input area, and landing page.
const getQwenCss = (aWidth) => `
    /* Message containers (user and assistant) */
    .qwen-chat-message {
        max-width: ${aWidth}% !important;
    }

    /* User message bubble */
    .chat-user-message {
        max-width: ${aWidth}% !important;
    }

    /* Input area */
    .message-input-wrapper {
        max-width: ${aWidth}% !important;
    }

    /* Input outer container */
    .chat-message-input-fixed-container {
        max-width: ${aWidth}% !important;
    }

    /* New chat landing page */
    .placeholder-logo-text {
        max-width: ${aWidth}% !important;
    }
`;

// DeepSeek: --message-list-max-width controls the message area and input container
// in active chats, but the landing page uses a hardcoded max-width (840px) on a
// container with a hashed class name that changes across builds.
// We override the CSS variable for active chats and use JS to widen the landing page.
const getDeepSeekCss = (aWidth) => `
    :root {
        --message-list-max-width: ${aWidth}% !important;
    }
`;

// Find the DeepSeek landing-page container (the nearest ancestor of the textarea
// that has a restrictive pixel-based max-width) and override it.
const widenDeepSeekLanding = (aWidth) => {
  const textarea = document.querySelector("textarea");
  if (!textarea) return;
  for (let el = textarea.parentElement; el && el !== document.body; el = el.parentElement) {
    const mw = getComputedStyle(el).maxWidth;
    if (mw.endsWith("px") && parseInt(mw) < window.innerWidth * 0.8) {
      el.style.setProperty("max-width", `${aWidth}%`, "important");
      return;
    }
  }
};

// Kimi: widens message list, segments, action bar, editor, and landing page.
const getKimiCss = (aWidth) => `
    /* Message list */
    .chat-content-list {
        max-width: ${aWidth}% !important;
    }

    /* Individual message segments */
    .segment-container {
        max-width: ${aWidth}% !important;
    }

    /* Bottom action bar */
    .bottom-action-container {
        max-width: ${aWidth}% !important;
    }

    /* Input area */
    .chat-editor {
        max-width: ${aWidth}% !important;
    }

    /* Notifications */
    .chat-notifications {
        max-width: ${aWidth}% !important;
    }

    /* New chat landing page */
    .home-banner {
        max-width: ${aWidth}% !important;
    }

    .landing-route-list {
        max-width: ${aWidth}% !important;
    }

    .show-case {
        max-width: ${aWidth}% !important;
    }
`;

// Pick the right CSS generator for the current site and inject the styles.
// Called on page load and whenever the user adjusts the width slider.
const setMaxWidth = (aWidth) => {
  let css = "";
  if (isChatGPT) {
    css = getChatGPTCss(aWidth);
  } else if (isClaude) {
    css = getClaudeCss(aWidth);
  } else if (isGemini) {
    css = getGeminiCss(aWidth);
  } else if (isGrok) {
    css = getGrokCss(aWidth);
  } else if (isQwen) {
    css = getQwenCss(aWidth);
  } else if (isDeepSeek) {
    css = getDeepSeekCss(aWidth);
    widenDeepSeekLanding(aWidth);
  } else if (isKimi) {
    css = getKimiCss(aWidth);
  }

  attachStyle(css);
};

// --- Initialization ---
// Load the persisted width and apply it immediately on page load.
let currentWidth = DEFAULT_WIDTH;
loadSettings().then((w) => { currentWidth = w; setMaxWidth(w); });

// DeepSeek is a SPA — the landing-page container may appear after navigation.
// Re-apply the JS-based fix whenever the DOM changes.
if (isDeepSeek) {
  new MutationObserver(() => widenDeepSeekLanding(currentWidth))
    .observe(document.body, { childList: true, subtree: true });
}

// Re-apply when the user changes width in the popup (no page reload needed).
browser.storage.onChanged.addListener((changes) => {
  if (changes.width) {
    currentWidth = changes.width.newValue || DEFAULT_WIDTH;
    setMaxWidth(currentWidth);
  }
});
