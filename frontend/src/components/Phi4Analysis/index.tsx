import React from 'react';
import { Box, Typography, CircularProgress, Paper, Grid, Button, Alert } from '@mui/material';
import { Phi4AnalysisProps } from '../../types/phi4';
import { usePhi4Analysis } from '../../hooks/usePhi4Analysis';
import { AnalysisForm } from './AnalysisForm';

export const Phi4Analysis: React.FC<Phi4AnalysisProps> = ({ documentText }) => {
  const {
    file,
    pdfUrl,
    analysisData,
    loading,
    error,
    handleFileChange,
    handleAnalyze,
    handleFieldChange,
    handleDetailChange,
  } = usePhi4Analysis(documentText);

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
          ) : analysisData ? (
            <AnalysisForm
              analysisData={analysisData}
              handleFieldChange={handleFieldChange}
              handleDetailChange={handleDetailChange}
            />
          ) : (
            <Box p={2}>
              <Typography variant="body2" color="textSecondary">
                PDFをアップロードして分析を開始してください
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};