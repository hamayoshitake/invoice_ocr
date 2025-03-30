import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Grid, Button, Alert } from '@mui/material';

interface Phi4AnalysisProps {
  documentText?: string;
}

interface AnalysisResponse {
  analysis: string;
  status: string;
}

export const Phi4Analysis: React.FC<Phi4AnalysisProps> = ({ documentText }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPdfUrl(URL.createObjectURL(selectedFile));
      setAnalysis('');
      setError('');
    } else {
      setError('PDFファイルを選択してください');
    }
  };

  const handleAnalyze = async () => {
    if (!file && !documentText) {
      setError('ファイルをアップロードするか、Document AIの分析を実行してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }

      console.log("APIキー:", import.meta.env.VITE_APP_API_KEY);
      console.log("API URL:", import.meta.env.VITE_APP_API_URL);

      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/invoice/phi4/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-api-key': import.meta.env.VITE_APP_API_KEY
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('分析中にエラーが発生しました');
      }

      const data: AnalysisResponse = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper elevation={3} sx={{ p: 2, height: '100%', minHeight: '800px', overflow: 'auto' }}>
          <Box mb={2} display="flex" alignItems="center" gap={2}>
            <input
              accept="application/pdf"
              style={{ display: 'none' }}
              id="raised-button-file"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="raised-button-file">
              <Button variant="contained" component="span">
                PDFをアップロード
              </Button>
            </label>
            {file && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleAnalyze}
                disabled={loading}
              >
                分析開始
              </Button>
            )}
          </Box>

          {pdfUrl && (
            <Box sx={{ width: '100%', height: 'calc(100% - 60px)' }}>
              <embed
                src={pdfUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                style={{ border: '1px solid #ccc' }}
              />
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper elevation={3} sx={{ p: 2, height: '100%', minHeight: '800px', overflow: 'auto' }}>
          {loading ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                分析中...
              </Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                分析結果
              </Typography>
              {analysis ? (
                <Typography variant="body1" whiteSpace="pre-wrap">
                  {analysis}
                </Typography>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  PDFをアップロードして分析を開始してください
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};