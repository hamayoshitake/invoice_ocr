import { useState } from 'react';
import axios from 'axios';
import { AnalysisData, AnalysisResponse, InvoiceDetail } from '../types/phi4';

export const usePhi4Analysis = (documentText?: string) => {
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

  return {
    file,
    pdfUrl,
    analysisData,
    loading,
    error,
    handleFileChange,
    handleAnalyze,
    handleFieldChange,
    handleDetailChange,
  };
};