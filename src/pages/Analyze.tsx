
import React, { useState, useRef } from 'react';
import ResizableNavbarDemo from '@/components/ResizableNavbarDemo';
import Footer from '@/components/Footer';
import StickyScrollRevealDemo from '@/components/StickyScrollRevealDemo';
import { Tiles } from '@/components/ui/tiles';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Upload, FileText, Sparkles, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { uploadDataset, analyzeData, checkServerHealth, type DatasetInfo, type AnalysisResult } from '@/lib/apiService';

const Analyze = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [question, setQuestion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check server health on component mount
  React.useEffect(() => {
    checkServerHealth().then(setServerHealthy);
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file || (!file.type.includes('csv') && !file.name.endsWith('.csv'))) {
      alert('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    try {
      // For the new FastAPI backend, we just store the file
      setUploadedFile(file);
      setDataset({
        table: 'data',
        columns: [],
        rows: 0,
        originalName: file.name,
      });
      setAnalysisResult(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile || !question.trim()) {
      alert('Please upload a file and enter a question');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeData(uploadedFile, question);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({
        ok: false,
        sql: '',
        rows: [],
        fields: [],
        insight: '',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ResizableNavbarDemo />
      
      {/* Enhanced Tiles Background with better contrast */}
      <div className="absolute inset-0 z-0">
        <Tiles 
          rows={50} 
          cols={20} 
          tileSize="md"
          className="opacity-40"
          tileClassName="border-polaris-purple/20 shadow-sm shadow-polaris-purple/10"
        />
        {/* Enhanced gradient overlay with deeper contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-polaris-purple/20 via-lightyear-lavender/10 to-galactic-green/15"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-background/20"></div>
      </div>

      {/* Main content with proper spacing to prevent navbar overlap */}
      <main className="pt-28 relative z-10 min-h-screen">
        {/* Sticky Scroll Reveal Section */}
        <StickyScrollRevealDemo />
        
        {/* Analysis Workflow */}
        <div className="container mx-auto px-4 pb-16 space-y-8">
          {/* Server Health Indicator */}
          {serverHealthy === false && (
            <div className="flex items-center justify-center">
              <div className="glass-morphic rounded-xl p-4 border border-red-500/30 shadow-xl shadow-red-500/20 backdrop-blur-xl">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>Backend server is not running. Please start the server with: npm run server</span>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="flex items-center justify-center">
            <div className="glass-morphic rounded-2xl p-12 max-w-2xl w-full text-center border border-polaris-purple/30 shadow-2xl shadow-polaris-purple/25 hover:shadow-polaris-purple/40 hover:scale-[1.02] hover:border-polaris-purple/50 transition-all duration-500 ease-out backdrop-blur-xl">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-polaris-purple/20 flex items-center justify-center border border-polaris-purple/30 shadow-lg shadow-polaris-purple/20">
                {uploadedFile ? (
                  <FileText className="w-12 h-12 text-polaris-purple" />
                ) : (
                  <Upload className="w-12 h-12 text-polaris-purple" />
                )}
              </div>
              
              {isUploading ? (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    Uploading and Processing...
                  </h2>
                  <div className="flex items-center justify-center mb-6">
                    <Loader2 className="w-8 h-8 animate-spin text-polaris-purple" />
                  </div>
                  <p className="text-muted-foreground">
                    Creating table and importing data...
                  </p>
                </div>
              ) : dataset ? (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    Dataset Ready for Analysis!
                  </h2>
                  <div className="text-left bg-background/50 rounded-lg p-4 mb-6 border border-polaris-purple/20">
                    <p className="text-sm text-muted-foreground mb-2">File: <span className="text-foreground">{dataset.originalName}</span></p>
                    <p className="text-sm text-muted-foreground mb-2">Rows: <span className="text-foreground">{dataset.rows.toLocaleString()}</span></p>
                    <p className="text-sm text-muted-foreground mb-2">Columns: <span className="text-foreground">{dataset.columns.length}</span></p>
                    <p className="text-sm text-muted-foreground">Table: <span className="text-foreground">{dataset.table}</span></p>
                  </div>
                  <Button
                    onClick={() => {
                      setUploadedFile(null);
                      setDataset(null);
                      setAnalysisResult(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    variant="outline"
                    className="border-polaris-purple/50 text-polaris-purple hover:bg-polaris-purple/10"
                  >
                    Upload Different File
                  </Button>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                    Upload your dataset here
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8">
                    AI will analyze it
                  </p>
                  <div 
                    className="border-2 border-dashed border-polaris-purple/40 rounded-xl p-8 hover:border-polaris-purple/60 hover:bg-polaris-purple/5 transition-all duration-300 cursor-pointer group"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <p className="text-foreground group-hover:text-polaris-purple transition-colors duration-300">
                      Drop your CSV files here or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Input Section */}
          {dataset && (
            <div className="flex items-center justify-center">
              <div className="glass-morphic rounded-2xl p-8 max-w-4xl w-full border border-polaris-purple/30 shadow-xl shadow-polaris-purple/20 backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-polaris-purple/20 flex items-center justify-center border border-polaris-purple/30">
                    <MessageSquare className="w-6 h-6 text-polaris-purple" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Ask a Question</h2>
                </div>
                
                <div className="space-y-4">
                  <Input
                    placeholder="What insights would you like from your data? (e.g., 'What is the average sales by region?')"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="bg-background/50 border-polaris-purple/30 focus:border-polaris-purple/60 text-lg py-6"
                    onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  />
                  
                  <Button
                    onClick={handleAnalyze}
                    disabled={!question.trim() || isAnalyzing}
                    className="w-full bg-polaris-purple hover:bg-polaris-purple/90 text-white py-6 text-lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Analyze Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {analysisResult && (
            <div className="space-y-6">
              {analysisResult.error ? (
                <Card className="glass-morphic border-red-500/30 shadow-xl shadow-red-500/20">
                  <CardHeader>
                    <CardTitle className="text-red-400">Analysis Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-300">{analysisResult.error}</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Insights */}
                  <Card className="glass-morphic border-polaris-purple/30 shadow-xl shadow-polaris-purple/20">
                    <CardHeader>
                      <CardTitle className="text-polaris-purple flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        AI Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground text-lg leading-relaxed">{analysisResult.insight}</p>
                    </CardContent>
                  </Card>

                  {/* SQL Query */}
                  <Card className="glass-morphic border-polaris-purple/30 shadow-xl shadow-polaris-purple/20">
                    <CardHeader>
                      <CardTitle className="text-polaris-purple">Generated SQL Query</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-background/50 p-4 rounded-lg text-sm text-foreground overflow-x-auto border border-polaris-purple/20">
                        {analysisResult.sql}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Results Table */}
                  <Card className="glass-morphic border-polaris-purple/30 shadow-xl shadow-polaris-purple/20">
                    <CardHeader>
                      <CardTitle className="text-polaris-purple">Query Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DataTable data={analysisResult.rows} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Analyze;
