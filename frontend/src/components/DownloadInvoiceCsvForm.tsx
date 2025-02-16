import React, { useState } from 'react';
import axios from 'axios';
import '../styles/component/DownloadInvoiceCsvForm.scss';

interface ApiResponse {
  downloadUrl: string;
}

const DownloadInvoiceCsvForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleMessageClick = () => {
    setMessage(null);
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

    console.log(import.meta.env.VITE_APP_API_URL);

    try {
      const response = await axios.post<ApiResponse>(
        `${import.meta.env.VITE_APP_API_URL}/api/csv/download`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-api-key': import.meta.env.VITE_APP_API_KEY,
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
    <div className="image-upload-container">
      <h3>請求書データCSVダウンロード</h3>
      {message && (
        <div className={`alert ${message.isError ? 'alert-danger' : 'alert-success'} mt-3`}
        onClick={handleMessageClick}
        >
          {message.text}
        </div>
      )}

      <div className="content-wrapper">
        {/* PDFビューア */}
        <div className="pdf-viewer">
            <div className="upload-section">
              <form onSubmit={handleSubmit}>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                  accept=".pdf"
                  />
                <button
                  type="submit"
                  className="btn btn-primary mt-2"
                  disabled={loading || !file}
                >
                  {loading ? '処理中...' : 'アップロード'}
                </button>
              </form>
            </div>
            {file && (
              <div className="pdf-container">
                <object
                  data={URL.createObjectURL(file)}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                >
                  <p>PDFを表示できません。</p>
                </object>
              </div>
            )}
        </div>
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        )}
  </div>
  );
};

export default DownloadInvoiceCsvForm;