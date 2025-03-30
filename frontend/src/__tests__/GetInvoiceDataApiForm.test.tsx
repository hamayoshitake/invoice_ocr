import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GetInvoiceDataApiForm from '../components/GetInvoiceDataApiForm';
import axios from 'axios';
import '@testing-library/jest-dom';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GetInvoiceDataApiForm', () => {
  const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ファイルが選択されていない場合はエラーメッセージを表示', () => {
    render(<GetInvoiceDataApiForm service="ai" />);
    
    const submitButton = screen.getByText('アップロード');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('ファイルを選択してください')).toBeInTheDocument();
  });

  it('ファイルアップロードが成功した場合、成功メッセージを表示', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          invoice_number: '123',
          invoice_date: '2024-03-20',
          due_date: '2024-04-20',
          total_amount: 10000,
          invoice_details: [
            {
              item_date: '2024-03-20',
              item_description: 'テスト商品',
              item_quantity: 1,
              item_unit_price: 10000,
              item_amount: 10000
            }
          ],
          analysis: {
            payee_identification_reason: 'テスト理由',
            payer_identification_reason: 'テスト理由'
          }
        }
      }
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    render(<GetInvoiceDataApiForm service="ai" />);
    
    const fileInput = screen.getByRole('button', { name: /アップロード/i });
    const submitButton = screen.getByText('アップロード');
    
    // ファイル選択をシミュレート
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    fireEvent.click(submitButton);

    // ローディング表示の確認
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('画像の処理が成功しました')).toBeInTheDocument();
    });

    // フォームデータが正しく表示されているか確認
    await waitFor(() => {
      expect(screen.getByDisplayValue('123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-03-20')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
    });

    // 明細データが正しく表示されているか確認
    await waitFor(() => {
      expect(screen.getByTestId('invoice-details')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テスト商品')).toBeInTheDocument();
    });
  });

  it('APIエラーが発生した場合、エラーメッセージを表示', async () => {
    const errorMessage = 'APIエラーが発生しました';
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: errorMessage } }
    });

    render(<GetInvoiceDataApiForm service="ai" />);
    
    const fileInput = screen.getByRole('button', { name: /アップロード/i });
    const submitButton = screen.getByText('アップロード');
    
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('Document Intelligence APIを使用する場合、正しいエンドポイントを呼び出す', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          invoice_number: '123',
          invoice_details: []
        }
      }
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    render(<GetInvoiceDataApiForm service="intelligence" />);
    
    const fileInput = screen.getByRole('button', { name: /アップロード/i });
    const submitButton = screen.getByText('アップロード');
    
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/invoice/document-intelligence/analyze'),
        expect.any(FormData),
        expect.any(Object)
      );
    });
  });
});