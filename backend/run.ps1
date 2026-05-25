# Start the SelfLearn API (use this, not study-agent/)
Set-Location $PSScriptRoot
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
& .\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
