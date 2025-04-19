// Global variables
let currentChatId = null;
let darkMode = localStorage.getItem('darkMode') === 'true';

// Apply theme on load
document.addEventListener('DOMContentLoaded', () => {
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Add enter key listener for chat input
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

// Toggle between light and dark mode
function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode');
    document.getElementById('theme-toggle').innerHTML = darkMode ? 
        '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Function to send a chat message to the backend
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const messageText = userInput.value.trim();
    const modelSelect = document.getElementById('model-select');
    const selectedModel = modelSelect ? modelSelect.value : null;
    
    if (!messageText) return;
    
    // Clear input field
    userInput.value = '';
    
    // Add user message to chat
    addMessageToChat('user', messageText);
    
    // Show typing indicator
    addTypingIndicator();
    
    try {
        // Send request to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText,
                chat_id: currentChatId,
                model: selectedModel
            }),
        });
        
        // Remove typing indicator
        removeTypingIndicator();
        
        if (response.ok) {
            const data = await response.json();
            currentChatId = data.chat_id;
            
            // Add AI response to chat
            addMessageToChat('assistant', data.response);
            
            // Scroll to bottom of chat
            scrollToBottom();
        } else {
            const errorData = await response.json();
            addMessageToChat('system', `Error: ${errorData.detail || 'Something went wrong'}`);
        }
    } catch (error) {
        // Remove typing indicator
        removeTypingIndicator();
        addMessageToChat('system', `Error: ${error.message || 'Failed to communicate with the server'}`);
    }
    
    // Scroll to bottom of chat
    scrollToBottom();
}

// Add a message to the chat UI
function addMessageToChat(role, content) {
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Simple markdown-like formatting
    let formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')  // Code blocks
        .replace(/`(.*?)`/g, '<code>$1</code>')            // Inline code
        .replace(/\n/g, '<br>');                          // Line breaks
    
    contentDiv.innerHTML = formattedContent;
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
}

// Add typing indicator
function addTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'message assistant-message typing-indicator';
    indicator.id = 'typing-indicator';
    
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dots.appendChild(dot);
    }
    
    indicator.appendChild(dots);
    chatMessages.appendChild(indicator);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Scroll to the bottom of the chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Admin Panel Functions
function updateModel() {
    const modelSelector = document.getElementById('model-selector');
    const model = modelSelector.value;
    
    fetch('/api/model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: model }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('current-model').textContent = data.model;
            alert('Model updated successfully!');
        }
    })
    .catch(error => alert('Error updating model: ' + error));
}

function addRule() {
    const newRuleInput = document.getElementById('new-rule');
    const rule = newRuleInput.value.trim();
    
    if (!rule) return;
    
    fetch('/api/rules', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rule: rule }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            newRuleInput.value = '';
            refreshRulesList(data.rules);
        }
    })
    .catch(error => alert('Error adding rule: ' + error));
}

function deleteRule(ruleId) {
    fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            refreshRulesList(data.rules);
        }
    })
    .catch(error => alert('Error deleting rule: ' + error));
}

function refreshRulesList(rules) {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = '';
    
    rules.forEach((rule, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${rule} <button onclick="deleteRule(${index})">Delete</button>`;
        rulesList.appendChild(li);
    });
}

function viewChat(chatId) {
    fetch(`/api/chats/${chatId}`)
    .then(response => response.json())
    .then(data => {
        const chatViewer = document.getElementById('chat-viewer');
        chatViewer.innerHTML = '<h3>Chat History</h3>';
        
        const chatContainer = document.createElement('div');
        chatContainer.className = 'admin-chat-history';
        
        data.history.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `admin-message ${message.role}-message`;
            messageDiv.textContent = `${message.role.toUpperCase()}: ${message.content}`;
            chatContainer.appendChild(messageDiv);
        });
        
        chatViewer.appendChild(chatContainer);
    })
    .catch(error => alert('Error viewing chat: ' + error));
}

// Load chats for the admin panel
function loadChats() {
    if (document.getElementById('active-chats')) {
        fetch('/api/chats')
        .then(response => response.json())
        .then(data => {
            const chatsList = document.getElementById('active-chats');
            chatsList.innerHTML = '';
            
            data.chats.forEach(chatId => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#" onclick="viewChat('${chatId}')">${chatId}</a>`;
                chatsList.appendChild(li);
            });
        })
        .catch(error => console.error('Error loading chats:', error));
    }
}

// Check if we're on the admin page and load chats
if (window.location.pathname === '/admin') {
    loadChats();
}