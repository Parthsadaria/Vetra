        // Initialize the app when the DOM is fully loaded
        document.addEventListener('DOMContentLoaded', function() {
            // DOM Elements
            const chatMessages = document.getElementById('chat-messages');
            const userInput = document.getElementById('user-input');
            const sendBtn = document.getElementById('send-btn');
            const loader = document.getElementById('loader');
            const sendText = document.getElementById('send-text');
            const ruleContent = document.getElementById('rule-content');
            const addRuleBtn = document.getElementById('add-rule');
            const clearFormBtn = document.getElementById('clear-form');
            const rulesList = document.getElementById('rules-list');
            const exportRulesBtn = document.getElementById('export-rules');
            const languageSelector = document.getElementById('language-selector');
            const settingsBtn = document.getElementById('settings-btn');
            const settingsPanel = document.getElementById('settings-panel');
            const closeSettingsBtn = document.getElementById('close-settings');
            const saveSettingsBtn = document.getElementById('save-settings');
            const apiEndpointInput = document.getElementById('api-endpoint');
            const apiModelInput = document.getElementById('api-model');
            const apiKeyInput = document.getElementById('api-key');

            // App State
            let rules = [];
            let settings = {
                apiEndpoint: "https://parthsadaria-lokiai.hf.space/chat/completions",
                model: "gemini",
                apiKey: "sigma"
            };

            // Load rules from localStorage if available
            function loadRules() {
                const savedRules = localStorage.getItem('chatbotRules');
                if (savedRules) {
                    rules = JSON.parse(savedRules);
                    renderRules();
                }
            }

            // Load settings from localStorage if available
            function loadSettings() {
                const savedSettings = localStorage.getItem('chatbotSettings');
                if (savedSettings) {
                    settings = JSON.parse(savedSettings);
                    apiEndpointInput.value = settings.apiEndpoint;
                    apiModelInput.value = settings.model;
                    apiKeyInput.value = settings.apiKey;
                }
            }

            // Save rules to localStorage
            function saveRules() {
                localStorage.setItem('chatbotRules', JSON.stringify(rules));
            }

            // Save settings to localStorage
            function saveSettings() {
                settings = {
                    apiEndpoint: apiEndpointInput.value,
                    model: apiModelInput.value,
                    apiKey: apiKeyInput.value
                };
                localStorage.setItem('chatbotSettings', JSON.stringify(settings));
                settingsPanel.classList.add('hidden');
            }

            // Render rules in the list
            function renderRules() {
                rulesList.innerHTML = '';
                if (rules.length === 0) {
                    rulesList.innerHTML = '<div class="system-message">No rules added yet. Add rules to customize the chatbot.</div>';
                    return;
                }
                
                rules.forEach((rule, index) => {
                    const ruleElement = document.createElement('div');
                    ruleElement.className = 'rule-item';
                    ruleElement.innerHTML = `
                        <p>${rule}</p>
                        <div class="rule-actions-inline">
                            <button class="edit-rule" data-index="${index}">Edit</button>
                            <button class="delete-rule danger" data-index="${index}">Delete</button>
                        </div>
                    `;
                    rulesList.appendChild(ruleElement);
                });

                // Add event listeners to edit and delete buttons
                document.querySelectorAll('.edit-rule').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-index'));
                        ruleContent.value = rules[index];
                        // Store the index to know which rule to update
                        ruleContent.setAttribute('data-edit-index', index);
                        addRuleBtn.textContent = 'Update Rule';
                    });
                });

                document.querySelectorAll('.delete-rule').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-index'));
                        if (confirm('Are you sure you want to delete this rule?')) {
                            rules.splice(index, 1);
                            saveRules();
                            renderRules();
                        }
                    });
                });
            }

            // Add a new message to the chat
            function addMessage(message, isUser = false) {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
                messageElement.textContent = message;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Add a system message to the chat
            function addSystemMessage(message) {
                const messageElement = document.createElement('div');
                messageElement.className = 'system-message';
                messageElement.textContent = message;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Show loading state
            function setLoading(isLoading) {
                if (isLoading) {
                    loader.classList.remove('hidden');
                    sendText.textContent = 'Sending...';
                    sendBtn.disabled = true;
                    userInput.disabled = true;
                } else {
                    loader.classList.add('hidden');
                    sendText.textContent = 'Send';
                    sendBtn.disabled = false;
                    userInput.disabled = false;
                }
            }

            // Send a message to the AI API
            async function sendToAI(message) {
                try {
                    const currentLanguage = languageSelector.value;
                    
                    // Create a prompt that includes rules and language preferences
                    let prompt = `You are an AI assistant for the General Administration Department, specializing in office procedures and rules. 
                        The user is asking in ${currentLanguage === 'en' ? 'English' : currentLanguage === 'gu' ? 'Gujarati' : 'Hindi'}.
                        Please respond in ${currentLanguage === 'en' ? 'English' : currentLanguage === 'gu' ? 'Gujarati' : 'Hindi'}.
                        
                        Here are the specific rules and procedures you should know about:\n\n`;
                    
                    // Add each rule to the prompt
                    rules.forEach((rule, index) => {
                        prompt += `Rule ${index + 1}: ${rule}\n\n`;
                    });
                    
                    // Add the user's message
                    prompt += `\nUser query: ${message}\n\nProvide a helpful, accurate response based on the rules above. If the query is not covered by these rules, politely state that you don't have that specific information.`;
                    
                    // Create the API request payload
                    const payload = {
                        model: settings.model,
                        messages: [
                            {
                                role: "system",
                                content: prompt
                            },
                            {
                                role: "user",
                                content: message
                            }
                        ],
                        temperature: 0.5,
                        max_tokens: 500
                    };
                    
                    // Make the API request
                    const response = await fetch(settings.apiEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${settings.apiKey}`
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!response.ok) {
                        throw new Error(`API request failed with status ${response.status}`);
                    }
                    
                    const data = await response.json();
                    return data.choices[0].message.content;
                } catch (error) {
                    console.error('Error sending message to AI:', error);
                    return "I'm sorry, I encountered an error while processing your request. Please try again later.";
                }
            }

            // Handle user sending a message
            async function handleSendMessage() {
                const message = userInput.value.trim();
                if (!message) return;
                
                // Add user message to chat
                addMessage(message, true);
                userInput.value = '';
                
                // If no rules are added, show a message
                if (rules.length === 0) {
                    addSystemMessage("No rules have been added yet. The assistant may not provide accurate information.");
                }
                
                // Show loading indicator
                setLoading(true);
                
                // Get AI response
                const response = await sendToAI(message);
                
                // Hide loading indicator
                setLoading(false);
                
                // Add AI response to chat
                addMessage(response);
            }

            // Handle adding or updating a rule
            function handleAddRule() {
                const content = ruleContent.value.trim();
                if (!content) return;
                
                const editIndex = ruleContent.getAttribute('data-edit-index');
                
                if (editIndex !== null) {
                    // Update existing rule
                    rules[editIndex] = content;
                    ruleContent.removeAttribute('data-edit-index');
                    addRuleBtn.textContent = 'Add Rule';
                } else {
                    // Add new rule
                    rules.push(content);
                }
                
                saveRules();
                renderRules();
                ruleContent.value = '';
            }

            // Export rules to a JSON file
            function exportRules() {
                const dataStr = JSON.stringify(rules, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = 'chatbot-rules.json';
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            }

            // Event Listeners
            sendBtn.addEventListener('click', handleSendMessage);
            
            userInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleSendMessage();
                }
            });
            
            addRuleBtn.addEventListener('click', handleAddRule);
            
            clearFormBtn.addEventListener('click', function() {
                ruleContent.value = '';
                ruleContent.removeAttribute('data-edit-index');
                addRuleBtn.textContent = 'Add Rule';
            });
            
            exportRulesBtn.addEventListener('click', exportRules);
            
            settingsBtn.addEventListener('click', function() {
                settingsPanel.classList.toggle('hidden');
            });
            
            closeSettingsBtn.addEventListener('click', function() {
                settingsPanel.classList.add('hidden');
            });
            
            saveSettingsBtn.addEventListener('click', saveSettings);
            
            // Import rules functionality
            document.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
            
            document.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        try {
                            const importedRules = JSON.parse(event.target.result);
                            if (Array.isArray(importedRules)) {
                                if (confirm(`Import ${importedRules.length} rules? This will replace existing rules.`)) {
                                    rules = importedRules;
                                    saveRules();
                                    renderRules();
                                    addSystemMessage(`Successfully imported ${importedRules.length} rules.`);
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing JSON file:', error);
                            addSystemMessage('Error importing rules. Make sure the file is a valid JSON array.');
                        }
                    };
                    reader.readAsText(file);
                } else {
                    addSystemMessage('Please drop a valid JSON file.');
                }
            });
            
            // Initialize the app
            loadSettings();
            loadRules();
        });