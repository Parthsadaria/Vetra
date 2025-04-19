from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
import httpx
import secrets
import os
from typing import List, Dict, Optional

# Initialize FastAPI app
app = FastAPI(title="AI Chat Application")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Basic auth setup for admin
security = HTTPBasic()
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "password")  # change in prod

def get_admin_user(credentials: HTTPBasicCredentials = Depends(security)):
    if not (secrets.compare_digest(credentials.username, ADMIN_USERNAME) and
            secrets.compare_digest(credentials.password, ADMIN_PASSWORD)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# In-memory data stores
chat_history: Dict[str, List[Dict[str, str]]] = {}
rules: List[str] = [
    "You are Vetra, an office bot that answers based on given rules",
    "Be respectful and helpful",
    "Do not generate harmful content",
    "Provide accurate information"
]
available_models: List[str] = ["mistral-large-latest", "gemini", "openai-xlarge"]
current_model: str = available_models[0]

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    chat_id: Optional[str] = None

class Rule(BaseModel):
    rule: str

class ModelRequest(BaseModel):
    model: str

# Serve index.html at root
@app.get("/", response_class=HTMLResponse)
async def read_root():
    try:
        with open("index.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="index.html not found")

# Helper function to create system message from rules
def create_system_message():
    """Create a system message by combining all active rules."""
    rules_text = "\n".join([f"- {rule}" for rule in rules])
    return {
        "role": "system", 
        "content": f"You are an AI assistant following these rules:\n{rules_text}"
    }

# Chat endpoint
@app.post("/api/chat", response_class=JSONResponse)
async def process_chat(chat_request: ChatMessage):
    chat_id = chat_request.chat_id or secrets.token_hex(8)
    
    # Initialize chat history with system message if it's a new chat
    if chat_id not in chat_history:
        chat_history[chat_id] = [create_system_message()]
    
    # Add user message to history
    chat_history[chat_id].append({"role": "user", "content": chat_request.message})

    # Check block rules
    for rule in rules:
        if rule.startswith("Block:") and rule[6:].lower() in chat_request.message.lower():
            return JSONResponse({"response": "I cannot respond due to content rules.", "chat_id": chat_id})

    # Always use the admin-selected model - no user choice
    api_request = {"model": current_model, "messages": chat_history[chat_id],
                   "temperature": 0.7, "max_tokens": 1000}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://parthsadaria-lokiai.hf.space/chat/completions",
                json=api_request,
                headers={"Authorization": "sigma"}
            )
            data = resp.json()
            if choices := data.get("choices"):
                msg = choices[0]["message"]["content"]
                chat_history[chat_id].append({"role": "assistant", "content": msg})
                return {"response": msg, "chat_id": chat_id, "model": current_model}
            else:
                err = "No response from AI model"
                chat_history[chat_id].append({"role": "assistant", "content": err})
                return {"response": err, "chat_id": chat_id}
    except httpx.RequestError as e:
        err = f"Error communicating with AI service: {e}"
        chat_history[chat_id].append({"role": "assistant", "content": err})
        return {"response": err, "chat_id": chat_id}

# Update system message when rules change
def update_system_message_in_chats():
    """Update the system message in all active chats when rules change."""
    new_system_msg = create_system_message()
    for chat_id in chat_history:
        # Replace the first message if it's a system message, or insert at beginning
        if chat_history[chat_id] and chat_history[chat_id][0].get("role") == "system":
            chat_history[chat_id][0] = new_system_msg
        else:
            chat_history[chat_id].insert(0, new_system_msg)

# Admin panel HTML
@app.get("/admin", response_class=HTMLResponse)
async def admin_panel(username: str = Depends(get_admin_user)):
    opts = "".join(
        f'<option value="{m}"{" selected" if m==current_model else ""}>{m}</option>'
        for m in available_models
    )
    rl = "".join(f'<li>{r} <button onclick="deleteRule({i})">Delete</button></li>'
                   for i, r in enumerate(rules))
    ch = "".join(
        f'''<li><a href="#" onclick="viewChat('{cid}')">{cid}</a></li>'''
        for cid in chat_history
    )
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Panel</title>
        <link rel="stylesheet" href="/static/style.css">
        <script>
            // Inline JavaScript for admin panel
            function updateModel() {{
                const model = document.getElementById('model-selector').value;
                fetch('/api/model', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{ model: model }})
                }})
                .then(response => response.json())
                .then(data => {{
                    document.getElementById('current-model-display').textContent = data.model;
                    alert('Model updated successfully!');
                }})
                .catch(error => {{
                    console.error('Error updating model:', error);
                    alert('Error updating model: ' + error);
                }});
            }}

            function addRule() {{
                const ruleInput = document.getElementById('new-rule');
                const rule = ruleInput.value.trim();
                if (!rule) return;
                
                fetch('/api/rules', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{ rule: rule }})
                }})
                .then(response => response.json())
                .then(data => {{
                    ruleInput.value = '';
                    refreshRules(data.rules);
                }})
                .catch(error => {{
                    console.error('Error adding rule:', error);
                    alert('Error adding rule: ' + error);
                }});
            }}

            function deleteRule(index) {{
                fetch(`/api/rules/${{index}}`, {{
                    method: 'DELETE'
                }})
                .then(response => response.json())
                .then(data => {{
                    refreshRules(data.rules);
                }})
                .catch(error => {{
                    console.error('Error deleting rule:', error);
                    alert('Error deleting rule: ' + error);
                }});
            }}

            function refreshRules(rules) {{
                const rulesList = document.getElementById('rules-list');
                rulesList.innerHTML = '';
                rules.forEach((rule, index) => {{
                    const li = document.createElement('li');
                    li.textContent = rule + ' ';
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.onclick = function() {{ deleteRule(index); }};
                    
                    li.appendChild(deleteBtn);
                    rulesList.appendChild(li);
                }});
            }}

            function viewChat(chatId) {{
                fetch(`/api/chats/${{chatId}}`)
                .then(response => response.json())
                .then(data => {{
                    const chatViewer = document.getElementById('chat-viewer');
                    chatViewer.innerHTML = `<h3>Chat: ${{chatId}}</h3>`;
                    
                    const chatList = document.createElement('ul');
                    chatList.className = 'chat-messages';
                    
                    data.history.forEach(msg => {{
                        const li = document.createElement('li');
                        li.className = `message ${{msg.role}}`;
                        li.innerHTML = `<strong>${{msg.role}}:</strong> ${{msg.content}}`;
                        chatList.appendChild(li);
                    }});
                    
                    chatViewer.appendChild(chatList);
                }})
                .catch(error => {{
                    console.error('Error fetching chat:', error);
                    alert('Error fetching chat: ' + error);
                }});
            }}
        </script>
    </head>
    <body>
      <h1>Admin</h1>
      
      <div>
        <label>Model:</label>
        <select id="model-selector">{opts}</select>
        <button onclick="updateModel()">Update</button>
        <p>Current model: <strong id="current-model-display">{current_model}</strong> (Applies to all chats)</p>
      </div>
      <div>
        <h2>Rules</h2>
        <ul id="rules-list">{rl}</ul>
        <input id="new-rule" placeholder="New rule"><button onclick="addRule()">Add</button>
      </div>
      <div>
        <h2>Chats</h2>
        <ul id="active-chats">{ch}</ul>
        <div id="chat-viewer"></div>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

# Rule management
@app.get("/api/rules", response_class=JSONResponse)
async def get_rules(username: str = Depends(get_admin_user)):
    return {"rules": rules}

@app.post("/api/rules", response_class=JSONResponse)
async def add_rule(rule_request: Rule, username: str = Depends(get_admin_user)):
    rules.append(rule_request.rule)
    update_system_message_in_chats()  # Update system messages in all chats
    return {"status": "success", "rules": rules}

@app.delete("/api/rules/{rule_id}", response_class=JSONResponse)
async def delete_rule(rule_id: int, username: str = Depends(get_admin_user)):
    if 0 <= rule_id < len(rules):
        rules.pop(rule_id)
        update_system_message_in_chats()  # Update system messages in all chats
        return {"status": "success", "rules": rules}
    raise HTTPException(status_code=404, detail="Rule not found")

# Model endpoint
@app.post("/api/model", response_class=JSONResponse)
async def set_model(model_request: ModelRequest, username: str = Depends(get_admin_user)):
    global current_model
    if model_request.model in available_models:
        current_model = model_request.model
        return {"status": "success", "model": current_model}
    raise HTTPException(status_code=400, detail="Invalid model")

# Chat retrieval
@app.get("/api/chats", response_class=JSONResponse)
async def get_chats(username: str = Depends(get_admin_user)):
    return {"chats": list(chat_history.keys())}

@app.get("/api/chats/{chat_id}", response_class=JSONResponse)
async def get_chat_history(chat_id: str, username: str = Depends(get_admin_user)):
    if chat_id in chat_history:
        return {"history": chat_history[chat_id]}
    raise HTTPException(status_code=404, detail="Chat not found")

# Debug run
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)