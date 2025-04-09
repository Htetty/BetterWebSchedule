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


document.addEventListener('DOMContentLoaded', () => {
  const icsButton = document.getElementById('exportIcsButton');
  const status = document.getElementById('status');
  const originalStatusText = status?.textContent || 'Status';
  const originalStatusStyle = status?.style.cssText || '';
  const ALLOWED_URL = "https://phx-ban-apps.smccd.edu/StudentRegistrationSsb/ssb/classRegistration/classRegistration";

  const runScriptIfAllowed = (tabs, callback) => {
    const currentUrl = tabs[0].url;
    if (currentUrl.startsWith(ALLOWED_URL)) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: callback
      });
    } else {
      if (status) {
        status.textContent = "Must be in 'Register for Classes'";
        status.style.borderLeft = "6px solid red";
      }
    }
  };

  if (icsButton) {
    icsButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        runScriptIfAllowed(tabs, () => {
          const detailsTab = document.querySelector('a#scheduleDetailsViewLink');
          const icsButton = document.getElementById('exportIcsButton');
          if (detailsTab) detailsTab.click();

          setTimeout(() => {
            
            if (typeof downloadScheduleICS === 'function') {
              downloadScheduleICS();
              chrome.runtime.sendMessage({ action: 'icsExported' });
            } else {
                console.error('downloadScheduleICS not found on page');
              }
          }, 1000);
        });
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'icsExported') {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Schedule Exported!';
        status.style.borderLeft = "6px solid green";
        setTimeout(() => {
          status.textContent = originalStatusText;
          status.style.cssText = originalStatusStyle;
        }, 3000);
      }
    }
  });
});