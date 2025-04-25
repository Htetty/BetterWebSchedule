chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  });
  
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'open_side_panel') {
      (async () => {
        await chrome.sidePanel.open({ tabId: sender.tab.id });
        await chrome.sidePanel.setOptions({
          tabId: sender.tab.id,
          path: 'popup.html',
          enabled: true
        });
      })();
    }
  });