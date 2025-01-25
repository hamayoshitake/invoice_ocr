import { useState } from 'react';
import axios from 'axios';
import '../styles/component/InvoiceUploadFormOnly.scss';

const ImageUploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setMessage({ text: 'ファイルを選択してください', isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.get('http://localhost:5173/api/ocr/invoice', {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      console.log('API Response:', response.data);
      setMessage({ text: '画像の処理が成功しました', isError: false });
    } catch (error) {
      console.error('Error:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : '画像の処理中にエラーが発生しました', 
        isError: true 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="image-upload-container">
      <h2>請求書OCRテスト</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="form-control"
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? '処理中...' : 'アップロード'}
        </button>
      </form>
      {message && (
        <div className={`alert ${message.isError ? 'alert-danger' : 'alert-success'}`}>
          {message.text}
        </div>
      )}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadForm;