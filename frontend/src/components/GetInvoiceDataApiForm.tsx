import { useState } from 'react';
import axios from 'axios';
import '../styles/component/GetInvoiceDataApiForm.scss';
import { InvoiceData, InvoiceDetail } from '../types/InvoiceData';
import { INVOICE_FIELD_LABELS, DisplayFields } from '../constants/labels/invoiceFieldLabels';
import { useEffect } from 'react';

type ResponseData = {
  status: string;
  data: InvoiceData;
}

interface GetInvoiceDataApiFormProps {
  service: 'ai' | 'intelligence';
}

const GetInvoiceDataApiForm = ({service}: GetInvoiceDataApiFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [generalFormData, setGeneralFormData] = useState<DisplayFields | null>(null)
  const [detailFormData, setDetailFormData] = useState<InvoiceDetail[] | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setMessage({ text: 'ファイルを選択してください', isError: true });
      return;
    }

    const endpoint = service === 'ai'
    ? '/api/invoice/document-ai/analyze'
    : '/api/invoice/document-intelligence/analyze';

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    console.log(import.meta.env.VITE_APP_API_URL);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_API_URL}${endpoint}`,
        formData,
        {
          headers: {
            'Content-Type': 'application/pdf',
            'x-api-key': import.meta.env.VITE_APP_API_KEY
          },
          withCredentials: false,
        }
      );

      const responseData = await response.data as ResponseData;
      const responseInvoiceData = await responseData.data as InvoiceData;
      setInvoiceData(responseInvoiceData);
      setMessage({ text: '画像の処理が成功しました', isError: false });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: error.response?.data?.message || '画像の処理中にエラーが発生しました',
        isError: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (key: keyof DisplayFields, value: string | number) => {
    if (generalFormData) {
      setGeneralFormData({ ...generalFormData, [key]: value });
    }
  };

  const handleDetailChange = (index: number, field: keyof InvoiceDetail, value: string | number) => {
    if (detailFormData) {
      const newDetails = [...detailFormData];
      newDetails[index] = { ...newDetails[index], [field]: value };
      setDetailFormData(newDetails);
    }
  };

  useEffect(() => {
    if (invoiceData) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { invoice_details, analysis, ...displayData } = invoiceData;
      setGeneralFormData(displayData);
      setDetailFormData(invoice_details);
    }
  }, [invoiceData]);

  useEffect(() => {
    setMessage(null);
  }, []);

  return (
    <div className="image-upload-container">
      <h3>請求書OCRテスト</h3>

      {message && (
        <div className={`alert ${message.isError ? 'alert-danger' : 'alert-success'} mt-3`}>
          {message.text}
        </div>
      )}

      <div className="content-wrapper">
        {/* 左側：PDFビューワー */}
        <div className="pdf-viewer">
          <div className="upload-section">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="form-control"
                />
                <button
                  type="submit"
                  className="btn btn-primary mt-2"
                  disabled={isLoading || !file}
                >
                  {isLoading ? '処理中...' : 'アップロード'}
                </button>
              </div>
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
                <p>PDFを表示できません</p>
              </object>
            </div>
          )}
        </div>

        {/* 右側：フォームデータ */}
        <div className="form-data">
          {generalFormData && (
            <div className="invoice-data">
              <h3>請求書データ</h3>

              {/* 基本情報の編集フォーム */}
              <div className="basic-info">
                {Object.entries(INVOICE_FIELD_LABELS).map(([key, label]) => {
                  const value = generalFormData?.[key as keyof DisplayFields];
                  return (
                    <div key={key} className="form-group">
                      <label>{label}</label>
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value ?? ''}
                        onChange={(e) => handleFieldChange(
                          key as keyof DisplayFields,
                          e.target.type === 'number' ? Number(e.target.value) : e.target.value
                        )}
                        className="form-control"
                      />
                    </div>
                  );
                })}
              </div>

              {/* 明細テーブル */}
              <div className="invoice-details mt-4">
                <h4>請求明細</h4>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>日付</th>
                        <th>項目</th>
                        <th>数量</th>
                        <th>単価</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailFormData?.map((detail, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="date"
                              value={detail.item_date}
                              onChange={(e) => handleDetailChange(index, 'item_date', e.target.value)}
                              className="form-control form-control-sm"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={detail.item_description}
                              onChange={(e) => handleDetailChange(index, 'item_description', e.target.value)}
                              className="form-control form-control-sm"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={detail.item_quantity}
                              onChange={(e) => handleDetailChange(index, 'item_quantity', Number(e.target.value))}
                              className="form-control form-control-sm"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={detail.item_unit_price}
                              onChange={(e) => handleDetailChange(index, 'item_unit_price', Number(e.target.value))}
                              className="form-control form-control-sm"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={detail.item_amount}
                              onChange={(e) => handleDetailChange(index, 'item_amount', Number(e.target.value))}
                              className="form-control form-control-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default GetInvoiceDataApiForm;