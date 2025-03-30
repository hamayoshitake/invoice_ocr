import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Grid, Button, Alert, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import axios from 'axios';

interface Phi4AnalysisProps {
  documentText?: string;
}

interface InvoiceDetail {
  item_date: string;
  item_description: string;
  item_amount: number;
  item_quantity: number;
  item_unit_price: number;
}

interface AnalysisData {
  analysis: {
    payee_identification_reason: string;
    payer_identification_reason: string;
  };
  payee_company_name: string;
  payee_postal_code: string;
  payee_address: string;
  payee_tel?: string;
  payee_email?: string;
  payee_person_name?: string;
  payer_company_name: string;
  payer_address?: string;
  payer_postal_code?: string;
  payer_person_name?: string;
  invoice_date?: string;
  due_date?: string;
  invoice_number?: string;
  total_amount: number;
  sub_total_amount: number;
  total_tax_amount: number;
  bank_name?: string;
  bank_account_name?: string;
  bank_store_type?: string;
  bank_type?: string;
  bank_number?: string;
  invoice_details?: InvoiceDetail[];
  memo?: string;
}

interface AnalysisResponse {
  status: string;
  data: AnalysisData;
}

export const Phi4Analysis: React.FC<Phi4AnalysisProps> = ({ documentText }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPdfUrl(URL.createObjectURL(selectedFile));
      setAnalysisData(null);
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

      const response = await axios.post<AnalysisResponse>(
        `${import.meta.env.VITE_APP_API_URL}/api/invoice/phi4/analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'application/pdf',
            'x-api-key': import.meta.env.VITE_APP_API_KEY
          },
          withCredentials: false,
        }
      );

      console.log("APIレスポンス:", response.data);
      setAnalysisData(response.data.data);
    } catch (error: any) {
      setError(error.response?.data?.message || '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof AnalysisData, value: any) => {
    if (analysisData) {
      setAnalysisData({ ...analysisData, [field]: value });
    }
  };

  const handleDetailChange = (index: number, field: keyof InvoiceDetail, value: any) => {
    if (analysisData?.invoice_details) {
      const newDetails = [...analysisData.invoice_details];
      newDetails[index] = { ...newDetails[index], [field]: value };
      handleFieldChange('invoice_details', newDetails);
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
          ) : analysisData ? (
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                分析結果
              </Typography>
              
              <Grid container spacing={2}>
                {/* 分析理由 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>判断理由</Typography>
                  <TextField
                    fullWidth
                    multiline
                    label="請求元判断理由"
                    value={analysisData.analysis.payee_identification_reason}
                    onChange={(e) => handleFieldChange('analysis', { 
                      ...analysisData.analysis,
                      payee_identification_reason: e.target.value 
                    })}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    multiline
                    label="請求先判断理由"
                    value={analysisData.analysis.payer_identification_reason}
                    onChange={(e) => handleFieldChange('analysis', { 
                      ...analysisData.analysis,
                      payer_identification_reason: e.target.value 
                    })}
                    margin="normal"
                  />
                </Grid>

                {/* 請求元情報 */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>請求元情報</Typography>
                  <TextField
                    fullWidth
                    label="会社名"
                    value={analysisData.payee_company_name}
                    onChange={(e) => handleFieldChange('payee_company_name', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="郵便番号"
                    value={analysisData.payee_postal_code}
                    onChange={(e) => handleFieldChange('payee_postal_code', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="住所"
                    value={analysisData.payee_address}
                    onChange={(e) => handleFieldChange('payee_address', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="電話番号"
                    value={analysisData.payee_tel || ''}
                    onChange={(e) => handleFieldChange('payee_tel', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="担当者名"
                    value={analysisData.payee_person_name || ''}
                    onChange={(e) => handleFieldChange('payee_person_name', e.target.value)}
                    margin="normal"
                  />
                </Grid>

                {/* 請求先情報 */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>請求先情報</Typography>
                  <TextField
                    fullWidth
                    label="会社名"
                    value={analysisData.payer_company_name}
                    onChange={(e) => handleFieldChange('payer_company_name', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="郵便番号"
                    value={analysisData.payer_postal_code || ''}
                    onChange={(e) => handleFieldChange('payer_postal_code', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="住所"
                    value={analysisData.payer_address || ''}
                    onChange={(e) => handleFieldChange('payer_address', e.target.value)}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="担当者名"
                    value={analysisData.payer_person_name || ''}
                    onChange={(e) => handleFieldChange('payer_person_name', e.target.value)}
                    margin="normal"
                  />
                </Grid>

                {/* 請求書情報 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>請求書情報</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="請求日"
                        type="text"
                        value={analysisData.invoice_date || ''}
                        onChange={(e) => handleFieldChange('invoice_date', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="支払期限"
                        type="text"
                        value={analysisData.due_date || ''}
                        onChange={(e) => handleFieldChange('due_date', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="請求書番号"
                        value={analysisData.invoice_number || ''}
                        onChange={(e) => handleFieldChange('invoice_number', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* 金額情報 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>金額情報</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="小計"
                        type="number"
                        value={analysisData.sub_total_amount}
                        onChange={(e) => handleFieldChange('sub_total_amount', Number(e.target.value))}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="消費税"
                        type="number"
                        value={analysisData.total_tax_amount}
                        onChange={(e) => handleFieldChange('total_tax_amount', Number(e.target.value))}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="合計金額"
                        type="number"
                        value={analysisData.total_amount}
                        onChange={(e) => handleFieldChange('total_amount', Number(e.target.value))}
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* 銀行情報 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>銀行情報</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="銀行名"
                        value={analysisData.bank_name || ''}
                        onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="支店名"
                        value={analysisData.bank_store_type || ''}
                        onChange={(e) => handleFieldChange('bank_store_type', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="口座種別"
                        value={analysisData.bank_type || ''}
                        onChange={(e) => handleFieldChange('bank_type', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="口座番号"
                        value={analysisData.bank_number || ''}
                        onChange={(e) => handleFieldChange('bank_number', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="口座名義"
                        value={analysisData.bank_account_name || ''}
                        onChange={(e) => handleFieldChange('bank_account_name', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* 明細情報 */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>明細情報</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>日付</TableCell>
                          <TableCell>項目</TableCell>
                          <TableCell>数量</TableCell>
                          <TableCell>単価</TableCell>
                          <TableCell>金額</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analysisData.invoice_details?.map((detail, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <TextField
                                fullWidth
                                value={detail.item_date}
                                onChange={(e) => handleDetailChange(index, 'item_date', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                value={detail.item_description}
                                onChange={(e) => handleDetailChange(index, 'item_description', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                type="number"
                                value={detail.item_quantity}
                                onChange={(e) => handleDetailChange(index, 'item_quantity', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                type="number"
                                value={detail.item_unit_price}
                                onChange={(e) => handleDetailChange(index, 'item_unit_price', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                type="number"
                                value={detail.item_amount}
                                onChange={(e) => handleDetailChange(index, 'item_amount', Number(e.target.value))}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                {/* メモ */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="メモ"
                    multiline
                    rows={2}
                    value={analysisData.memo || ''}
                    onChange={(e) => handleFieldChange('memo', e.target.value)}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Box>
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