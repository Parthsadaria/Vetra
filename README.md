# Vetra – Your AI Workplace Assistant 🤖

Vetra is a smart AI bot designed to help employees easily check workplace rules, policies, and get quick answers to internal queries. Whether deployed on Hugging Face or your internal server, Vetra makes access to company info smooth and intuitive.

## Features

- **Multi-model support**: Choose between Mistral, Gemini, and OpenAI XLarge models  
- **Real-time chat interface**: Smooth convo experience with markdown support  
- **Admin panel**: Manage rules, monitor chats, and switch default models  
- **Dark/Light mode**: Toggle themes for comfy viewing  
- **Responsive design**: Works flawlessly on desktop and mobile  
- **Simple architecture**: Just 5 core files – easy to deploy, easy to tweak  

## Project Structure

```
/
├── main.py            # FastAPI backend server
├── index.html         # Combined homepage and chat UI
├── static/
│   ├── script.js      # JavaScript for chat functionality
│   └── style.css      # Styling for the application
├── Dockerfile         # For containerized deployment
├── requirements.txt   # Python dependencies
└── README.md          # Documentation
```

## Setup & Running

### Local Development

1. Clone the repo  
2. Install deps:  
   ```bash
   pip install -r requirements.txt
   ```  
3. Run the app:  
   ```bash
   python main.py
   ```  
4. Open <http://localhost:8000> in your browser

### Docker Deployment

1. Build the image:  
   ```bash
   docker build -t vetra-ai-bot .
   ```  
2. Run the container:  
   ```bash
   docker run -p 8000:8000 vetra-ai-bot
   ```

### Hugging Face Deployment

1. Create a new Space on Hugging Face  
2. Choose **Docker** as the Space SDK  
3. Upload all files  
4. Hugging Face handles the rest 💅

## Configuration

Default admin creds are in `main.py` (username: `admin`, password: `password`).  
Override with env vars:  
- `ADMIN_USERNAME`  
- `ADMIN_PASSWORD`  

## API Usage

Vetra hits this endpoint for AI responses:  
```
https://parthsadaria-lokiai.hf.space/chat/completions
```  
Supported models:  
- `mistral-large-latest`  
- `gemini`  
- `openai-xlarge`  

## Customization

- Tweak **style.css** to change the look  
- Modify **main.py** to add features  
- Revamp **index.html** to update the UI  

## License

Open-source and free to use. Customize it for your team, your office, your vibe.  
