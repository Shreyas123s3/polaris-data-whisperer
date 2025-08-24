from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import sqlite3
import json
from urllib import request, parse
from io import StringIO  # For in-memory CSV handling
from typing import Optional

app = FastAPI(title="LLM-Based Data Analyst Assistant")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "AIzaSyBd-4g7IalaEX94jTNKlZ2GDTYd8uipEUk"

def call_gemini(prompt, model="gemini-1.5-flash-latest"):
    """
    Calls the Gemini API to generate content based on the prompt.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}"
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    data_str = json.dumps(data)
    req = request.Request(url, data=data_str.encode('utf-8'), method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with request.urlopen(req) as response:
            response_body = response.read().decode('utf-8')
            result = json.loads(response_body)
            if 'candidates' in result:
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                return "Error: No candidates in response."
    except Exception as e:
        return f"Error: {str(e)}"

def setup_db(csv_content: str):
    """
    Loads CSV content into an in-memory SQLite database.
    Returns the DB connection.
    """
    conn = sqlite3.connect(':memory:')  # In-memory for security
    df = pd.read_csv(StringIO(csv_content))  # Read from memory
    df.to_sql('data', conn, if_exists='replace', index=False)
    return conn

def get_schema(conn):
    """
    Retrieves the schema of the 'data' table.
    """
    schema_df = pd.read_sql("PRAGMA table_info(data);", conn)
    return schema_df.to_string()

def data_analyst_assistant(conn, question: str):
    """
    Generates SQL via Gemini, executes it, and explains results.
    """
    schema = get_schema(conn)
    sql_prompt = f"""You are an expert data analyst. The database has a single table named 'data'.
Schema:
{schema}

User question: "{question}"

Translate this to a precise SQL query that answers the question. Consider ambiguities like date ranges (e.g., 'last quarter' might mean the most recent 3 months based on data).
Output ONLY the SQL query inside ```sql
query here
```. No explanations."""
    
    sql_response = call_gemini(sql_prompt)
    
    # Extract SQL
    try:
        sql_query = sql_response.split('```sql')[1].split('```')[0].strip()
    except IndexError:
        return {"error": "Error extracting SQL query from Gemini response.", "sql_query": None, "result": None}
    
    # Execute query
    try:
        result = pd.read_sql(sql_query, conn).to_dict(orient='records')  # JSON-friendly
    except Exception as e:
        return {"error": f"Error executing SQL: {str(e)}", "sql_query": sql_query, "result": None}
    
    # Explain insights
    explain_prompt = f"""You are an expert data analyst.
User question: "{question}"
SQL query used: {sql_query}
Query results:
{json.dumps(result)}

Provide a clear natural language explanation of the results, including key insights, trends, and any caveats (e.g., data assumptions or limitations). Keep it concise."""
    
    explanation = call_gemini(explain_prompt)
    
    return {"explanation": explanation, "result": result, "sql_query": sql_query}

@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...), question: str = Form(...)):
    """
    Endpoint to upload CSV and analyze with a question.
    """
    try:
        csv_content = await file.read()  # Read file content
        csv_str = csv_content.decode('utf-8')  # Decode to string
        conn = setup_db(csv_str)
        response = data_analyst_assistant(conn, question)
        conn.close()
        return response
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
