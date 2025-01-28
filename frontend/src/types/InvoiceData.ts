export interface InvoiceDetail {
  item_date: string;
  item_description: string;
  item_amount: number;
  item_quantity: number;
  item_unit_price: number;
}

interface Analysis {
  payee_identification_reason: string;
  payer_identification_reason: string;
}

export interface InvoiceData {
  analysis: Analysis;
  payee_company_name: string;
  payee_postal_code: string;
  payee_address: string;
  payee_tel: string | null;
  payee_email: string | null;
  payee_person_name: string;
  payer_company_name: string;
  payer_address: string;
  payer_postal_code: string;
  payer_person_name: string;
  invoice_date: string;
  due_date: string;
  invoice_number: string;
  total_amount: number;
  sub_total_amount: number;
  total_tax_amount: number;
  bank_name: string;
  bank_account_name: string | null;
  bank_store_type: string | null;
  bank_type: string | null;
  bank_number: string;
  invoice_details: InvoiceDetail[];
  memo: string;
}