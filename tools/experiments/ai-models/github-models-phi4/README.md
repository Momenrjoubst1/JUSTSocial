# GitHub Models: Microsoft Phi-4 Integration

This project provides a simple, secure, and robust Python integration for calling Microsoft's **Phi-4** model (and others) via the GitHub Models API.

## Prerequisites

- Python 3.8 or higher.
- A GitHub Personal Access Token (PAT).
- Access to GitHub Models (currently in preview).

## Setup Instructions

### 1. Get your GitHub Token
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens).
2. Create a new token (Classic or Fine-grained).
3. Ensure it has access to **GitHub Models** (usually requires "Read" access to models).
4. Copy the token.

### 2. Configure Environment
1. In this directory, create a `.env` file (based on `.env.example`):
   ```powershell
   cp .env.example .env
   ```
2. Open `.env` and paste your token:
   ```env
   GITHUB_MODELS_TOKEN=your_actual_token_here
   ```

### 3. Install Dependencies
It is recommended to use a virtual environment:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
```

## How to Run

### Basic Usage
Run the script with the default prompt:
```powershell
python main.py
```

### Custom Message
Pass a message as a command-line argument:
```powershell
python main.py "How do I make a chocolate cake?"
```

### Streaming Support
Enable real-time streaming of the response:
```powershell
python main.py "Write a short story about a robot" --stream
```

### Change Model
You can specify a different model available in GitHub Models:
```powershell
python main.py "Hello!" --model "gpt-4o"
```

## Security & Best Practices
- **Environment Variables**: Sensitive tokens are stored in `.env` and loaded via `python-dotenv`.
- **Git Safety**: `.env` is included in `.gitignore` to prevent accidental commits.
- **Error Handling**: Includes retry logic using `tenacity` for rate limits and connection issues.
- **Async I/O**: Built with `asyncio` for better performance in networked applications.

## Troubleshooting
- **Unauthorized (401)**: Ensure your `GITHUB_MODELS_TOKEN` is correct and has not expired.
- **Rate Limit (429)**: The script will automatically retry with exponential backoff.
- **Model Not Found**: Ensure you have access to the specific model (e.g., "Phi-4") in the GitHub Marketplace.
