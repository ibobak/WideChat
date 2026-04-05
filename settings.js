const browser = globalThis.browser || globalThis.chrome;
const DEFAULT_WIDTH = 100;

// Load saved width and set the input value
browser.storage.local.get("width").then((result) => {
  const widthInput = document.getElementById("inputWidth");
  if (widthInput) {
    widthInput.value = result.width || DEFAULT_WIDTH;
  }
});

// Save width on input change
const widthInput = document.getElementById("inputWidth");
if (widthInput) {
  widthInput.addEventListener("input", () => {
    const value = parseInt(widthInput.value, 10) || DEFAULT_WIDTH;
    browser.storage.local.set({ width: value });
  });
}

// Apply button — saves and closes the popup
const applyBtn = document.getElementById("apply-btn");
applyBtn.addEventListener("click", () => {
  const value = parseInt(widthInput.value, 10) || DEFAULT_WIDTH;
  browser.storage.local.set({ width: value }).then(() => window.close());
});
