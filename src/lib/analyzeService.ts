import { supabase } from './supabase'
import Papa from 'papaparse'

const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY
const TEXT2SQL_MODEL = "Snowflake/Arctic-Text2SQL-R1-7B"
const INSIGHT_MODEL = "google/flan-t5-large"

export interface AnalysisResult {
  table: string
  sql: string
  results: any[]
  insight: string
  error?: string
}

export interface ColumnInfo {
  column_name: string
  data_type: string
}

// Generate unique table name with session ID
function generateTableName(): string {
  const sessionId = crypto.randomUUID().slice(0, 8)
  return `uploaded_data_${sessionId}`
}

// Infer PostgreSQL data type from JavaScript value
function inferDataType(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'TEXT'
  }
  
  if (!isNaN(Number(value))) {
    if (Number.isInteger(Number(value))) {
      return 'INTEGER'
    } else {
      return 'FLOAT'
    }
  }
  
  return 'TEXT'
}

// Sanitize column names for PostgreSQL
function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[^a-z_]/, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Create table and insert data from CSV
export async function uploadCsvToSupabase(file: File): Promise<string> {
  try {
    const tableName = generateTableName()
    
    // Parse CSV file
    const csvText = await file.text()
    const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject
      })
    })
    
    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`)
    }
    
    const data = parseResult.data
    if (data.length === 0) {
      throw new Error('No data found in CSV file')
    }
    
    // Get columns and infer types from first few rows
    const originalColumns = Object.keys(data[0])
    const sampleSize = Math.min(10, data.length)
    const columnTypes: Record<string, string> = {}
    
    originalColumns.forEach(col => {
      const sanitizedCol = sanitizeColumnName(col)
      const sampleValues = data.slice(0, sampleSize).map(row => row[col])
      
      // Determine the most appropriate type
      let hasFloats = false
      let hasIntegers = false
      let hasStrings = false
      
      sampleValues.forEach(val => {
        if (val !== null && val !== undefined && val !== '') {
          if (!isNaN(Number(val))) {
            if (Number.isInteger(Number(val))) {
              hasIntegers = true
            } else {
              hasFloats = true
            }
          } else {
            hasStrings = true
          }
        }
      })
      
      if (hasStrings) {
        columnTypes[sanitizedCol] = 'TEXT'
      } else if (hasFloats) {
        columnTypes[sanitizedCol] = 'FLOAT'
      } else if (hasIntegers) {
        columnTypes[sanitizedCol] = 'INTEGER'
      } else {
        columnTypes[sanitizedCol] = 'TEXT'
      }
    })
    
    // Create table schema
    const columnDefinitions = Object.entries(columnTypes)
      .map(([col, type]) => `"${col}" ${type}`)
      .join(', ')
    
    const createTableSQL = `CREATE TABLE "${tableName}" (${columnDefinitions});`
    
    // Execute table creation
    const { error: createError } = await supabase.rpc('execute_sql', {
      query: createTableSQL
    })
    
    if (createError) {
      throw new Error(`Failed to create table: ${createError.message}`)
    }
    
    // Prepare data for insertion
    const sanitizedData = data.map(row => {
      const sanitizedRow: Record<string, any> = {}
      originalColumns.forEach(originalCol => {
        const sanitizedCol = sanitizeColumnName(originalCol)
        let value = row[originalCol]
        
        // Convert empty strings to null
        if (value === '') {
          value = null
        } else if (columnTypes[sanitizedCol] === 'INTEGER' && value !== null) {
          value = parseInt(value, 10)
        } else if (columnTypes[sanitizedCol] === 'FLOAT' && value !== null) {
          value = parseFloat(value)
        }
        
        sanitizedRow[sanitizedCol] = value
      })
      return sanitizedRow
    })
    
    // Insert data in batches
    const batchSize = 100
    for (let i = 0; i < sanitizedData.length; i += batchSize) {
      const batch = sanitizedData.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch)
      
      if (insertError) {
        throw new Error(`Failed to insert data: ${insertError.message}`)
      }
    }
    
    return tableName
  } catch (error) {
    console.error('Error uploading CSV:', error)
    throw error
  }
}

// Get table schema information
export async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position;
    `
  })
  
  if (error) {
    throw new Error(`Failed to get schema: ${error.message}`)
  }
  
  return data || []
}

// Generate SQL query using Hugging Face model
export async function generateSQL(schema: ColumnInfo[], question: string): Promise<string> {
  const schemaText = schema
    .map(col => `${col.column_name} (${col.data_type})`)
    .join(', ')
  
  const prompt = `You are a text-to-SQL model.
Schema:
${schemaText}

Question:
${question}

Generate a valid PostgreSQL SQL query that answers the question. Return only the SQL query without any explanation or additional text.`
  
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${TEXT2SQL_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.1,
          return_full_text: false
        }
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (data.error) {
    throw new Error(`Hugging Face model error: ${data.error}`)
  }
  
  let generatedSQL = data[0]?.generated_text || data.generated_text || ''
  
  // Clean up the generated SQL
  generatedSQL = generatedSQL.trim()
  
  // Remove any explanation text and extract just the SQL
  const sqlMatch = generatedSQL.match(/SELECT[\s\S]*?(?:;|$)/i)
  if (sqlMatch) {
    generatedSQL = sqlMatch[0].replace(/;$/, '')
  }
  
  return generatedSQL
}

// Execute SQL query on Supabase
export async function executeSQLQuery(sql: string, tableName: string): Promise<any[]> {
  try {
    // Basic SQL injection protection - only allow SELECT statements
    const trimmedSQL = sql.trim().toLowerCase()
    if (!trimmedSQL.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed')
    }
    
    // Replace any table references with the actual table name
    const finalSQL = sql.replace(/FROM\s+\w+/gi, `FROM "${tableName}"`)
    
    const { data, error } = await supabase.rpc('execute_sql', {
      query: finalSQL
    })
    
    if (error) {
      throw new Error(`SQL execution error: ${error.message}`)
    }
    
    return data || []
  } catch (error) {
    console.error('Error executing SQL:', error)
    throw error
  }
}

// Generate insights from query results using Hugging Face
export async function generateInsights(results: any[], question: string): Promise<string> {
  const resultsText = JSON.stringify(results.slice(0, 5)) // Limit to first 5 rows
  
  const prompt = `User asked: ${question}
Query results: ${resultsText}

Provide a clear, concise explanation of what these results show in plain English. Focus on key findings and patterns.`
  
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${INSIGHT_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.3
        }
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (data.error) {
    throw new Error(`Hugging Face model error: ${data.error}`)
  }
  
  return data[0]?.generated_text || data.generated_text || 'No insights generated'
}

// Main orchestrator function
export async function analyzeQuestion(file: File, question: string): Promise<AnalysisResult> {
  try {
    // 1. Upload CSV to Supabase
    const tableName = await uploadCsvToSupabase(file)
    
    // 2. Get table schema
    const schema = await getTableSchema(tableName)
    
    // 3. Generate SQL query
    const sql = await generateSQL(schema, question)
    
    // 4. Execute SQL query
    const results = await executeSQLQuery(sql, tableName)
    
    // 5. Generate insights
    const insight = await generateInsights(results, question)
    
    return {
      table: tableName,
      sql,
      results,
      insight
    }
  } catch (error) {
    console.error('Error in analysis:', error)
    return {
      table: '',
      sql: '',
      results: [],
      insight: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}
