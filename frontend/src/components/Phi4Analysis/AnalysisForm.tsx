import React from 'react';
import { Box, Typography, Grid, TextField, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { AnalysisData, InvoiceDetail } from '../../types/phi4';

interface AnalysisFormProps {
  analysisData: AnalysisData;
  handleFieldChange: (field: keyof AnalysisData, value: any) => void;
  handleDetailChange: (index: number, field: keyof InvoiceDetail, value: any) => void;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({
  analysisData,
  handleFieldChange,
  handleDetailChange,
}) => {
  return (
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
  );
};