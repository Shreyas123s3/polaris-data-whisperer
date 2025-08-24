// Simple Express server for handling file uploads and data analysis
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { config } from 'dotenv';

config();

const app = express();
const port = 3001;

// Configure CORS
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Supabase client
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are not set');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Utility functions
const sanitizeIdent = (s) =>
  s.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^(\d)/, "_$1");

function inferType(values) {
  let hasFloat = false, hasInt = true, hasBool = true, hasDate = true;
  
  for (const raw of values.slice(0, 500)) {
    const v = (raw ?? "").trim();
    if (v === "" || v.toLowerCase() === "null") continue;
    if (!/^(true|false|1|0)$/i.test(v)) hasBool = false;
    if (!/^-?\d+$/.test(v)) hasInt = false;
    if (!/^-?\d+(\.\d+)?$/.test(v)) hasFloat = hasFloat || false; else hasFloat = true;
    if (isNaN(Date.parse(v))) hasDate = false;
  }
  
  if (hasBool) return "boolean";
  if (hasInt) return "bigint";
  if (hasFloat) return "double precision";
  if (hasDate) return "timestamptz";
  return "text";
}

const onlySelect = (sql) =>
  /^\s*with\s+|^\s*select\s+/is.test(sql) && 
  !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/is.test(sql);

// API Routes

// Upload CSV endpoint
app.post('/api/datasets/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const csv = req.file.buffer.toString('utf8');
    const records = parse(csv, { 
      columns: true, 
      skip_empty_lines: true, 
      trim: true 
    });

    if (!records.length) {
      return res.status(400).json({ error: 'CSV has no rows' });
    }

    const rawCols = Object.keys(records[0]);
    const cols = rawCols.map(sanitizeIdent);

    // Infer types per column
    const colTypes = cols.map((c, i) => {
      const values = records.map(r => String(r[rawCols[i]] ?? ""));
      return inferType(values);
    });

    const tableName = sanitizeIdent(`ds_${Date.now()}`);

    // Create the table using Supabase RPC (we'll need to create this function in Supabase)
    const createTableSQL = `CREATE TABLE IF NOT EXISTS public.${tableName} (` +
      cols.map((c, i) => `"${c}" ${colTypes[i]}`).join(", ") +
      ");";
    
    const { error: createError } = await supabase.rpc('execute_sql', {
      query: createTableSQL
    });
    
    if (createError) {
      throw new Error(`Failed to create table: ${createError.message}`);
    }

    // Insert rows in chunks using Supabase
    const chunkSize = 100; // Smaller chunks for Supabase
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      
      // Prepare data for Supabase insert
      const insertData = chunk.map(row => {
        const rowData = {};
        cols.forEach((col, idx) => {
          let value = row[rawCols[idx]];
          if (value === "" || value === null || value === undefined) {
            value = null;
          }
          rowData[col] = value;
        });
        return rowData;
      });

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(insertData);
      
      if (insertError) {
        throw new Error(`Failed to insert data: ${insertError.message}`);
      }
    }

    res.json({
      ok: true,
      table: tableName,
      columns: cols.map((c, i) => ({ name: c, type: colTypes[i] })),
      rows: records.length,
      originalName: req.file.originalname || 'upload.csv',
    });
  } catch (err) {
    console.error('UPLOAD_ERROR:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Analyze data endpoint
app.post('/api/analyze/run', async (req, res) => {
  try {
    const { table, question } = req.body;
    
    if (!table || !question) {
      return res.status(400).json({ error: 'Missing table or question' });
    }

    // Get table schema using Supabase RPC
      const { data: schemaRows, error: schemaError } = await supabase.rpc('execute_sql', {
        query: `SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name='${table}'
                ORDER BY ordinal_position`
      });

      if (schemaError) {
        throw new Error(`Failed to get schema: ${schemaError.message}`);
      }

      const schemaText = schemaRows.map(r => `${r.column_name} (${r.data_type})`).join(", ");

      const prompt = `You are a SQL generator. Only output a single valid PostgreSQL SELECT query that answers the question.
Table: public.${table}
Columns: ${schemaText}

Question: "${question}"

Rules:
- Use only columns listed.
- If aggregation is asked (sum/avg/count), include it.
- If unsure, make the safest reasonable assumption.
- Output ONLY the SQL, no commentary, no code fences.`;

      const hfRes = await fetch(`https://api-inference.huggingface.co/models/defog/sqlcoder-7b-2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: prompt, 
          parameters: { max_new_tokens: 256, temperature: 0.1 } 
        }),
      });

      if (!hfRes.ok) {
        const msg = await hfRes.text();
        return res.status(502).json({ error: `HF error: ${msg}` });
      }

      const out = await hfRes.json();
      const raw = Array.isArray(out) ? out[0]?.generated_text ?? "" : (out?.generated_text ?? out?.[0]?.generated_text ?? "");
      const sql = String(raw || "").trim().replace(/```sql|```/g, "");

      if (!onlySelect(sql)) {
        return res.status(400).json({ error: "Generated SQL rejected (non-SELECT)", sql });
      }

      const { data: queryResult, error: queryError } = await supabase.rpc('execute_sql', {
        query: sql
      });

      if (queryError) {
        throw new Error(`SQL execution error: ${queryError.message}`);
      }
      
      // Generate insights
      const resultsForInsight = Array.isArray(queryResult) ? queryResult.slice(0, 5) : [];
      const insightPrompt = `User asked: "${question}"
Query results: ${JSON.stringify(resultsForInsight)}

Provide a clear, concise explanation of what these results show in plain English. Focus on key findings and patterns.`;

      const insightRes = await fetch(`https://api-inference.huggingface.co/models/google/flan-t5-large`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: insightPrompt, 
          parameters: { max_new_tokens: 150, temperature: 0.3 } 
        }),
      });

      let insight = "Analysis completed successfully.";
      if (insightRes.ok) {
        const insightData = await insightRes.json();
        insight = insightData[0]?.generated_text || insightData.generated_text || insight;
      }

      res.json({
        ok: true,
        sql,
        rows: queryResult || [],
        fields: queryResult && queryResult.length > 0 ? Object.keys(queryResult[0]) : [],
        insight,
      });
  } catch (err) {
    console.error('ANALYZE_ERROR:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: 'SELECT 1 as ok'
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    res.json({ 
      ok: true, 
      db: data && data.length > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📊 Ready to handle data analysis requests`);
});

export default app;
