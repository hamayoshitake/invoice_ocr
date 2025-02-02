import React, { useState } from 'react';
import axios from 'axios';

interface ApiResponse {
  downloadUrl: string;
}

const InvoiceUploadForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setMessage({ text: 'ファイルを選択してください', isError: true });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);

    try {
      const response = await axios.post<ApiResponse>(
        'https://us-central1-invoice-ocr-app-668f6.cloudfunctions.net/upload',
        // 'http://127.0.0.1:5001/invoice-ocr-app-668f6/us-central1/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: false,
        }
      );

      // ダウンロード処理
      const link = document.createElement('a');
      link.href = response.data.downloadUrl;
      link.setAttribute('download', `invoice_ocr_result.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ text: 'ダウンロードが完了しました', isError: false });
    } catch (error: any) {
      console.error(error);
      setMessage({ text: error.response?.data?.message || 'エラーが発生しました', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 className="mb-3">請求書アップロード</h2>
      {message && (
        <div className={`alert ${message.isError ? 'alert-danger' : 'alert-success'} mt-3`}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="file"
            className="form-control"
            id="file"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">アップロード</button>
      </form>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploadForm;