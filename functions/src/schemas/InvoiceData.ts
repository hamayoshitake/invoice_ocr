import {z} from "zod";

// メインの請求書データの型定義
export interface InvoiceData {
  payee_company_name: string;
  payee_postal_code: string;
  payee_address: string;
  payee_tel?: string;
  payee_email?: string;
  payee_person_name?: string;
  payer_company_name: string;
  payer_address?: string;
  payer_postal_code?: string;
  payer_person_name?: string;
  invoice_date: string;
  due_date: string;
  invoice_number: string;
  total_amount: number;
  sub_total_amount: number;
  total_tax_amount: number;
  bank_name?: string;
  bank_account_name?: string;
  bank_store_type?: string;
  bank_type?: string;
  bank_number?: string;
  memo?: string;
  invoice_details: {
    item_date: string;
    item_description: string;
    item_amount: number;
    item_quantity: number;
    item_unit_price: number;
  }[];
}

// Zodスキーマの定義
const InvoiceDetailSchema = z.object({
  item_date: z.string().nullable(),
  item_description: z.string().nullable(),
  item_amount: z.number().nullable(),
  item_quantity: z.number().nullable(),
  item_unit_price: z.number().nullable(),
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
  payer_person_name: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  total_amount: z.number(),
  sub_total_amount: z.number(),
  total_tax_amount: z.number(),
  bank_name: z.string().nullable().optional(),
  bank_account_name: z.string().nullable().optional(),
  bank_store_type: z.string().nullable().optional(),
  bank_type: z.string().nullable().optional(),
  bank_number: z.string().nullable().optional(),
  invoice_details: z.array(InvoiceDetailSchema),
  memo: z.string().nullable().optional(),
});
