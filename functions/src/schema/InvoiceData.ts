import { z } from 'zod';

// // 請求書明細項目の型定義
// interface InvoiceDetail {
//   item_date: string;
//   item_description: string;
//   item_amount: number;
//   item_quantity: number;
//   item_unit_price: number;
// }

// メインの請求書データの型定義
export interface InvoiceData {
  payee_company_name: string;
  payee_postal_code: string;
  payee_address: string;
  payee_tel?: string;  // オプショナル
  payee_email?: string;  // オプショナル
  payee_person_name?: string;  // オプショナル
  payer_company_name: string;
  payer_address?: string;  // オプショナル
  payer_postal_code?: string;  // オプショナル
  payer_person_name?: string;  // オプショナル
  invoice_date: string;  // 必須
  due_date: string;  // 必須
  invoice_number: string;  // 必須
  total_amount: number;  // 必須
  sub_total_amount: number;  // 必須
  total_tax_amount: number;  // 必須
  bank_name?: string;  // オプショナル
  bank_account_name?: string;  // オプショナル
  bank_store_type?: string;  // オプショナル
  band_type?: string;  // オプショナル
  bank_number?: string;  // オプショナル
  invoice_details: {
    item_date: string;  // 必須
    item_description: string;  // 必須
    item_amount: number;  // 必須
    item_quantity: number;  // 必須
    item_unit_price: number;  // 必須
  }[];
}

// Zodスキーマの定義
const InvoiceDetailSchema = z.object({
  item_date: z.string().nullable(),
  item_description: z.string().nullable(),
  item_amount: z.number().nullable(),
  item_quantity: z.number().nullable(),
  item_unit_price: z.number().nullable()
});

export const InvoiceDataSchema = z.object({
  payee_company_name: z.string(),
  payee_postal_code: z.string(),
  payee_address: z.string(),
  payee_tel: z.string().nullable().optional(),
  payee_email: z.string().nullable().optional(),
  payee_person_name: z.string().nullable().optional(),
  payer_company_name: z.string(),
  payer_address: z.string().nullable().optional(),
  payer_postal_code: z.string().nullable().optional(),
  payer_parson_name: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  total_amount: z.number(),
  sub_total_amount: z.number(),
  total_tax_amount: z.number(),
  bank_name: z.string().nullable().optional(),
  bank_account_name: z.string().nullable().optional(),
  bank_store_type: z.string().nullable().optional(),
  band_type: z.string().nullable().optional(),
  bank_number: z.string().nullable().optional(),
  invoice_details: z.array(InvoiceDetailSchema)
});
