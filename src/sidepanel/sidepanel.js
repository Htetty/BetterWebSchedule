console.log('sidepanel.js');

var firebaseApp = firebase.initializeApp({ 
    apiKey: "AIzaSyC4cGXqwHlZC1iv9ZjeXaNqyzI-kMh7y6Y",
      authDomain: "kupidochat-bd3c5.firebaseapp.com",
      databaseURL: "https://kupidochat-bd3c5.firebaseio.com",
      storageBucket: "kupidochat-bd3c5.appspot.com",
      messagingSenderId: "972492700679"
  });
  
  var db = firebaseApp.database();
  
  var chatApp = db.ref('chatApp'); //chatApp
  
  var dirRef = chatApp.child('directory');
  var chatRef = chatApp.child('chats');
  var userRef = chatApp.child('users');
  
  
  var app = new Vue({
    el: '#chatApp',
    firebase: {
      directory: dirRef
    },
    data: {
      headUser: 'Marinho Gomes',
      showChatList: false,
      chatBoxArea: true,
      currentChats: []
    },
    methods: {
      showUsuario: function(id){
        console.log(id);
      },
      expandTextArea: function(){
        $('#chatBox-textbox').height(80);
        $('#chatTextarea').height(60);
      },
      dexpandTetArea: function(){
        $('#chatBox-textbox').height(60);
        $('#chatTextarea').height(40);
      },
      toggleChat: function(){
        if(this.chatBoxArea){
          $('#chatbox-area').hide();
        }else{
          $('#chatbox-area').show();
        }
        this.chatBoxArea = !this.chatBoxArea;
      },
      openChatBox: function(info){
        
      },
      startChat: function(user){
        
      },
      expandChatList: function(){    $("#userListBox").slideToggle();
        this.showChatList = !this.showChatList;
        
      }
    }
  })

// State management
const state = {
    messages: [],
    chatHistory: [],
    currentChatId: null,
    isGenerating: false,
    theme: 'light'  // Default theme
};

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const welcomeScreen = document.getElementById('welcome-screen');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const newChatButton = document.getElementById('new-chat-btn');
const historyContainer = document.getElementById('history-container');
const themeSelect = document.getElementById('theme-select');
const clearStorageBtn = document.getElementById('clear-storage-btn');
const confirmationModal = document.getElementById('confirmation-modal');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

// Initialize app
function initApp() {
    loadSettings();
    loadChatHistory();
    createNewChat();
    setupEventListeners();
    autoResizeTextarea();
    applyTheme(state.theme);
}

// Load settings from localStorage
function loadSettings() {
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            state.theme = savedTheme;
            themeSelect.value = savedTheme;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem('theme', state.theme);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Apply theme to document
function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    state.theme = themeName;
    saveSettings();
}

// Load chat history from localStorage
function loadChatHistory() {
    try {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            state.chatHistory = JSON.parse(savedHistory);
            renderChatHistory();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Save chat history to localStorage
function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
        renderChatHistory();
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Render chat history in sidebar
function renderChatHistory() {
    historyContainer.innerHTML = '';
    state.chatHistory.forEach(chat => {
        const historyItem = document.createElement('div');
        historyItem.className = 'chat-history-item';
        historyItem.textContent = chat.title || 'New Chat';
        historyItem.dataset.chatId = chat.id;
        historyItem.addEventListener('click', () => loadChat(chat.id));
        historyContainer.appendChild(historyItem);
    });
}

// Create a new chat
function createNewChat() {
    state.messages = [];
    state.currentChatId = Date.now().toString();
    
    // Add system message
    state.messages.push({
        role: 'system',
        content: CONFIG.initialSystemPrompt
    });

    // Add to chat history
    state.chatHistory.unshift({
        id: state.currentChatId,
        title: 'New Chat',
        messages: [...state.messages]
    });
    
    saveChatHistory();
    clearChatUI();
    userInput.focus();
}

// Load a chat from history
function loadChat(chatId) {
    const chat = state.chatHistory.find(c => c.id === chatId);
    if (chat) {
        state.currentChatId = chat.id;
        state.messages = [...chat.messages];
        clearChatUI();
        
        // Display chat messages (excluding system message)
        state.messages.slice(1).forEach(msg => {
            appendMessageToUI(msg.role, msg.content);
        });
        
        userInput.focus();
    }
}

// Clear chat UI
function clearChatUI() {
    chatContainer.innerHTML = '';
    welcomeScreen.style.display = 'none';
}

// Update chat title based on the first user message
function updateChatTitle(userMessage) {
    const chatIndex = state.chatHistory.findIndex(chat => chat.id === state.currentChatId);
    if (chatIndex !== -1) {
        // Use first ~30 chars of first user message as title
        if (state.chatHistory[chatIndex].title === 'New Chat') {
            const title = userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
            state.chatHistory[chatIndex].title = title;
            saveChatHistory();
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Theme selector
    themeSelect.addEventListener('change', (event) => {
        applyTheme(event.target.value);
    });
    
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    // Enable/disable send button based on input
    userInput.addEventListener('input', () => {
        sendButton.disabled = userInput.value.trim() === '' || state.isGenerating;
        autoResizeTextarea();
    });
    
    // New chat button
    newChatButton.addEventListener('click', createNewChat);
    
    // Clear storage button
    clearStorageBtn.addEventListener('click', () => {
        showConfirmationModal();
    });
    
    // Modal buttons
    modalCancel.addEventListener('click', hideConfirmationModal);
    modalConfirm.addEventListener('click', clearAllData);
    
    // Close modal if clicked outside
    confirmationModal.addEventListener('click', (event) => {
        if (event.target === confirmationModal) {
            hideConfirmationModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && confirmationModal.classList.contains('active')) {
            hideConfirmationModal();
        }
    });
}

// Show confirmation modal
function showConfirmationModal() {
    confirmationModal.classList.add('active');
}

// Hide confirmation modal
function hideConfirmationModal() {
    confirmationModal.classList.remove('active');
}

// Clear all localStorage data
function clearAllData() {
    try {
        localStorage.clear();
        state.chatHistory = [];
        state.theme = 'light';
        
        // Reset UI
        themeSelect.value = 'light';
        applyTheme('light');
        renderChatHistory();
        createNewChat();
        
        // Hide modal
        hideConfirmationModal();
        
        // Show feedback to user
        appendMessageToUI('assistant', 'All chat history and settings have been cleared successfully.');
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        appendMessageToUI('assistant', 'There was an error clearing your data. Please try again.');
    }
}

// Auto-resize textarea as user types
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}

// Append a message to the UI
function appendMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
    avatar.innerHTML = role === 'user' ? 
        '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' : 
        '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path></svg>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content markdown';
    
    // Convert markdown-like formatting to HTML
    const formattedContent = formatMarkdown(content);
    messageContent.innerHTML = formattedContent;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);
    
    // Scroll to the bottom of the chat
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar ai-avatar';
    avatar.innerHTML = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path></svg>';
    
    const typingContent = document.createElement('div');
    typingContent.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = 'Thinking<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    typingContent.appendChild(typingIndicator);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingContent);
    chatContainer.appendChild(typingDiv);
    
    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Format markdown-like syntax to HTML
function formatMarkdown(text) {
    // Handle code blocks
    text = text.replace(/```(\w*)([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Escape HTML special characters
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Send message to the API
async function sendMessage() {
    const userMessage = userInput.value.trim();
    if (userMessage === '' || state.isGenerating) return;
    
    // Clear user input and reset height
    userInput.value = '';
    userInput.style.height = 'auto';
    sendButton.disabled = true;
    
    // Add user message to UI
    appendMessageToUI('user', userMessage);
    
    // Add user message to state
    state.messages.push({
        role: 'user',
        content: userMessage
    });
    
    // Update chat in history
    updateChatTitle(userMessage);
    const chatIndex = state.chatHistory.findIndex(chat => chat.id === state.currentChatId);
    if (chatIndex !== -1) {
        state.chatHistory[chatIndex].messages = [...state.messages];
        saveChatHistory();
    }
    
    // Add typing indicator
    addTypingIndicator();
    state.isGenerating = true;
    
    try {
        // Prepare the API request
        const requestBody = {
            model: CONFIG.model,
            messages: state.messages,
            stream: true,
            temperature: 0.7
        };
        
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(CONFIG.apiKey && { 'Authorization': `Bearer ${CONFIG.apiKey}` })
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        // Remove typing indicator and prepare for streaming response
        removeTypingIndicator();
        
        // Create container for AI message
        appendMessageToUI('assistant', '');
        const aiMessageElement = chatContainer.lastChild.querySelector('.message-content');
        
        let fullResponse = '';
        
        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete JSON objects in the buffer
            let lastJSONEnd = 0;
            
            // Try to find and parse each chunk from the stream
            while (buffer.indexOf('\n', lastJSONEnd) !== -1) {
                const lineEnd = buffer.indexOf('\n', lastJSONEnd);
                const line = buffer.substring(lastJSONEnd, lineEnd).trim();
                lastJSONEnd = lineEnd + 1;
                
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    
                    // Handle [DONE] signal
                    if (jsonStr === '[DONE]') continue;
                    
                    try {
                        const json = JSON.parse(jsonStr);
                        
                        // Extract content from the chunk
                        const content = json.choices?.[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            
                            // Update the UI with the new content
                            aiMessageElement.innerHTML = formatMarkdown(fullResponse);
                            
                            // Scroll to the bottom
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Error parsing JSON from stream:', e);
                    }
                }
            }
            
            // Keep any incomplete data in the buffer
            buffer = buffer.substring(lastJSONEnd);
        }
        
        // Add AI response to state
        state.messages.push({
            role: 'assistant',
            content: fullResponse
        });
        
        // Update chat in history
        const updatedChatIndex = state.chatHistory.findIndex(chat => chat.id === state.currentChatId);
        if (updatedChatIndex !== -1) {
            state.chatHistory[updatedChatIndex].messages = [...state.messages];
            saveChatHistory();
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        appendMessageToUI('assistant', 'Sorry, there was an error communicating with the API. Please check your connection and API settings.');
    } finally {
        state.isGenerating = false;
        sendButton.disabled = userInput.value.trim() === '';
        userInput.focus();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);