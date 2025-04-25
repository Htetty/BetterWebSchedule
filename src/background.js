/* chrome.contextMenus.create({
    id: 'aichat',
    title: 'Ask SMCCCD AI Assistant',
    contexts: ['all']
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log(info);
    console.log(tab);
    chrome.tabs.sendMessage(tab.id, {action: 'aichat'});
    console.log(response);
  }); */

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'openSidePanel',
      title: 'Ask SMCCCD AI Assistant',
      contexts: ['all']
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'openSidePanel') {
      // This will open the panel in all the pages on the current window.
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
  });

  const GOOGLE_ORIGIN = 'https://phx-ban-apps.smccd.edu/StudentRegistrationSsb/ssb/registration';

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  // Enables the side panel on SMCCCD Website
  if (url.origin === GOOGLE_ORIGIN) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'src/sidepanel/sidepanel.html',
      enabled: true
    });
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));