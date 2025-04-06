const toggle = document.getElementById("darkToggle");

chrome.storage.sync.get("darkMode", (data) => {
  toggle.checked = data.darkMode === true;
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;

  chrome.storage.sync.set({ darkMode: enabled });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: enabled ? "enable-dark" : "disable-dark"
    });
  });
});

const colorToggle = document.getElementById("colorBlockToggle");

chrome.storage.sync.get("colorBlocks", (data) => {
  colorToggle.checked = data.colorBlocks === true;
});

colorToggle.addEventListener("change", () => {
  const enabled = colorToggle.checked;

  chrome.storage.sync.set({ colorBlocks: enabled });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: enabled ? "enable-color-blocks" : "disable-color-blocks"
    });
  });
});
