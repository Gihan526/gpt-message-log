let messageList = [];
let currentChatId = null;

function getCurrentChatId() {
  // Extract chat ID from URL
  const url = window.location.href;
  const match = url.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : 'default';
}

function updatePanel(text) {
  // Send message to extension panel
  chrome.runtime.sendMessage({ type: 'newMessage', text })
    .catch(error => {
      // Ignore errors about receiving end not existing (popup not open)
      if (!error.message.includes("Receiving end does not exist")) {
        console.error("[ChatGPT Messages] Error sending message:", error);
      }
    });
}

function clearPanel() {
  chrome.runtime.sendMessage({ type: 'clearMessages' })
    .catch(error => {
      if (!error.message.includes("Receiving end does not exist")) {
        console.error("[ChatGPT Messages] Error clearing messages:", error);
      }
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getMessages') {
    // Send all existing messages to popup
    messageList.forEach(text => updatePanel(text));
    sendResponse({ success: true });
  }
});

/* ========== Get existing messages from DOM ========== */
function getExistingMessages() {
  const nodes = document.querySelectorAll("[data-message-author-role='user']");
  const texts = Array.from(nodes)
    .map(n => (n.innerText || n.textContent || "").trim())
    .filter(Boolean);
    
  messageList = []; // Clear existing messages
  texts.forEach(text => {
    if (!messageList.includes(text)) {
      messageList.push(text);
      updatePanel(text);
    }
  });
}

/* ========== Observe DOM for new user messages ========== */
function observeUserMessages() {
  const root = document.querySelector("main") || document.body;
  if (!root) return;

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        
        // Check if the added node is a user message or contains user messages
        const userMessages = node.matches?.("[data-message-author-role='user']")
          ? [node]
          : node.querySelectorAll?.("[data-message-author-role='user']");

        if (userMessages && userMessages.length) {
          userMessages.forEach((msgNode) => {
            const text = (msgNode.innerText || msgNode.textContent || "").trim();
            if (text && !messageList.includes(text)) {
              messageList.push(text);
              updatePanel(text);
            }
          });
        }
      }
    }
  });

  obs.observe(root, { childList: true, subtree: true });
  console.log("[ChatGPT Messages] DOM observer attached");
}

/* ========== Monitor URL changes for chat switching ========== */
function monitorChatChanges() {
  let lastUrl = window.location.href;
  
  const checkUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      const newChatId = getCurrentChatId();
      if (newChatId !== currentChatId) {
        console.log("[ChatGPT Messages] Chat changed, clearing messages");
        currentChatId = newChatId;
        messageList = [];
        clearPanel();
        
        // Wait a bit for new chat to load, then get messages
        setTimeout(() => {
          getExistingMessages();
        }, 500);
      }
      lastUrl = currentUrl;
    }
  };

  // Check for URL changes every 500ms
  setInterval(checkUrlChange, 500);
  
  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(checkUrlChange, 100);
  });
}

/* ========== Initialize ========== */
function initialize() {
  currentChatId = getCurrentChatId();
  getExistingMessages();
  observeUserMessages();
  monitorChatChanges();
}

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initialize, 1000);
  });
} else {
  setTimeout(initialize, 1000);
}