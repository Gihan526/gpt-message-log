const messageList = document.getElementById("messages");
let displayedMessages = new Set();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'newMessage' && !displayedMessages.has(message.text)) {
    displayedMessages.add(message.text);
    const messageElement = document.createElement("div");
    messageElement.textContent = message.text;
    messageList.appendChild(messageElement);
    
    // Scroll to bottom to show latest message
    messageList.scrollTop = messageList.scrollHeight;
  } else if (message.type === 'clearMessages') {
    // Clear all displayed messages
    messageList.innerHTML = '';
    displayedMessages.clear();
  }
});

// Request existing messages when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url.includes('chatgpt.com')) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'getMessages' })
      .catch(() => {
        // Content script might not be ready yet
      });
  }
});