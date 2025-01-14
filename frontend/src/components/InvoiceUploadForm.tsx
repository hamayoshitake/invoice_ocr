// src/components/InvoiceUploadForm.tsx
import React, { useState } from 'react';
import axios from 'axios';

const InvoiceUploadForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [payeeCompanyName, setPayeeCompanyName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('payeeCompanyName', payeeCompanyName);

    setLoading(true);

    console.log('payeeCompanyName', payeeCompanyName);
    console.log('file', file);
    console.log('formData', formData);

    try {
      const response = await axios.post('http://127.0.0.1:5001/invoice-ocr-app-668f6/us-central1/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
        timeout: 30000
      });

      // ダウンロード用のURLを作成
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoice.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error uploading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2>請求書アップロード</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="payeeCompanyName" className="form-label">請求先会社名</label>
          <input
            type="text"
            className="form-control"
            id="payeeCompanyName"
            value={payeeCompanyName}
            onChange={(e) => setPayeeCompanyName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="file" className="form-label">請求書ファイル</label>
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