// API service for communicating with the FastAPI backend server
const API_BASE_URL = 'http://localhost:8000';

export interface DatasetInfo {
  table: string;
  columns: Array<{ name: string; type: string }>;
  rows: number;
  originalName: string;
}

export interface AnalysisResult {
  ok: boolean;
  sql: string;
  rows: any[];
  fields: string[];
  insight: string;
  error?: string;
}

export async function uploadDataset(file: File): Promise<DatasetInfo> {
  // For the new FastAPI backend, we don't need to upload separately
  // The file will be processed directly during analysis
  // This function is kept for compatibility but returns a mock response
  return {
    table: 'data',
    columns: [],
    rows: 0,
    originalName: file.name,
  };
}

export async function analyzeData(file: File, question: string): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('question', question);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Analysis failed');
  }

  // Transform the FastAPI response to match the expected format
  return {
    ok: !data.error,
    sql: data.sql_query || '',
    rows: data.result || [],
    fields: data.result && data.result.length > 0 ? Object.keys(data.result[0]) : [],
    insight: data.explanation || '',
    error: data.error || undefined,
  };
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/docs`);
    return response.ok;
  } catch {
    return false;
  }
}
