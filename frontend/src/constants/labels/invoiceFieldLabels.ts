import { InvoiceData } from '../../types/InvoiceData';

export const INVOICE_FIELD_LABELS: Record<keyof Omit<InvoiceData, 'analysis' | 'invoice_details'>, string> = {
  payee_company_name: '請求元会社名',
  payee_postal_code: '請求元郵便番号',
  payee_address: '請求元住所',
  payee_tel: '請求元電話番号',
  payee_email: '請求元メール',
  payee_person_name: '請求元担当者名',
  payer_company_name: '請求先会社名',
  payer_address: '請求先住所',
  payer_postal_code: '請求先郵便番号',
  payer_person_name: '請求先担当者名',
  invoice_date: '請求日',
  due_date: '支払期限',
  invoice_number: '請求書番号',
  total_amount: '合計金額',
  sub_total_amount: '小計',
  total_tax_amount: '消費税',
  bank_name: '銀行名',
  bank_account_name: 'アカウント名',
  bank_store_type: '支店名',
  bank_type: '口座区分',
  bank_number: '口座番号',
  memo: '備考'
};

export type DisplayFields = Omit<InvoiceData, 'invoice_details' | 'analysis'>;
