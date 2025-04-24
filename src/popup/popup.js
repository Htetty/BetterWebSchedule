const toggle = document.getElementById("darkToggle");
const colorToggle = document.getElementById("colorBlockToggle");
const icsButton = document.getElementById("exportIcsButton");
const statusEl = document.getElementById("status");
const webScheduleBtn = document.getElementById("webschedule");
const originalStatusText = statusEl?.textContent || 'Status';
const originalStatusStyle = statusEl?.style.cssText || '';
const ALLOWED_URL = "https://phx-ban-apps.smccd.edu/StudentRegistrationSsb/ssb/classRegistration/classRegistration";

function withCurrentTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && tabs[0]) {
      callback(tabs[0]);
    }
  });
}

//DARK MODE TOGGLE
chrome.storage.sync.get("darkMode", (data) => {
  toggle.checked = data.darkMode === true;
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ darkMode: enabled });

  withCurrentTab((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      action: enabled ? "enable-dark" : "disable-dark"
    });
  });
});

//COLOR BLOCKS TOGGLE
chrome.storage.sync.get("colorBlocks", (data) => {
  colorToggle.checked = data.colorBlocks === true;
});

colorToggle.addEventListener("change", () => {
  const enabled = colorToggle.checked;
  chrome.storage.sync.set({ colorBlocks: enabled });

  withCurrentTab((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      action: enabled ? "enable-color-blocks" : "disable-color-blocks"
    });
  });
});

//ICS EXPORT
document.addEventListener('DOMContentLoaded', () => {
  const runScriptIfAllowed = (tabs, callback) => {
    const currentUrl = tabs[0].url;
    if (currentUrl.startsWith(ALLOWED_URL)) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: callback
      });
    } else {
      if (statusEl) {
        statusEl.textContent = "Must be in 'Register for Classes'";
        statusEl.style.borderLeft = "6px solid red";
      }
    }
  };

  if (icsButton) {
    icsButton.addEventListener('click', () => {
      icsButton.disabled = true;
      withCurrentTab((tab) => {
        runScriptIfAllowed([tab], () => {
          const detailsTab = document.querySelector('a#scheduleDetailsViewLink');
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

      setTimeout(() => {
        icsButton.disabled = false;
      }, 3000);
    });

  }

  if (webScheduleBtn) {
    webScheduleBtn.addEventListener("click", () => {
      window.open("https://phx-ban-apps.smccd.edu/StudentRegistrationSsb/ssb/registration", "_blank");
    });
  }
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'icsExported') {
      if (statusEl) {
        statusEl.textContent = 'Schedule Exported!';
        statusEl.style.borderLeft = "6px solid green";
        setTimeout(() => {
          statusEl.textContent = originalStatusText;
          statusEl.style.cssText = originalStatusStyle;
        }, 3000);
      }
    }
  });
});

document.getElementById('createTransferPlan').addEventListener('click', async() => {
  const currentSchool = document.getElementById('currentSchool').value;
  const major = document.getElementById('major').value;
  const transferSchool = document.getElementById('transferSchool').value;
  
  try{
      const response = await fetch('http://localhost:3000/transfer-plan',{
          method: 'POST',
          headers: {
            'Content-Type' : 'application/json',
          },
          body: JSON.stringify({
            currentSchool: currentSchool,
            transferSchool: transferSchool,
            major: major
          })
      })

  } catch (error){
    console.log(error);
  }
}); 
