Write-Host "Starting FastAPI Backend..." -ForegroundColor Green
Write-Host ""
Write-Host "Make sure you have Python installed and the requirements installed:" -ForegroundColor Yellow
Write-Host "pip install -r requirements.txt" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server on http://localhost:8000" -ForegroundColor Green
Write-Host "API docs available at http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
python app.py
