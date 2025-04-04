const toggle = document.getElementById("darkToggle");

// Load saved state and update checkbox on popup open
chrome.storage.sync.get("darkMode", (data) => {
  toggle.checked = data.darkMode === true;
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;

  // Save the setting
  chrome.storage.sync.set({ darkMode: enabled });

  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: enabled ? "enable-dark" : "disable-dark"
    });
  });
});
