interface InvoiceData {
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
  band_type?: string;
  bank_number?: string;
  invoice_details: {
    item_date: string;
    item_description: string;
    item_amount: number;
    item_quantity: number;
    item_unit_price: number;
  }[];
}

export function getCsvContent(invoiceData: InvoiceData): string {
  const headers = [
    "行形式",
    "請求元会社名",
    "請求元郵便番号",
    "請求元住所",
    "請求元電話番号",
    "請求元メール",
    "請求元担当者",
    "請求先会社名",
    "請求日",
    "支払期日",
    "請求書番号",
    "合計金額",
    "小計",
    "消費税",
    "銀行名",
    "口座名義",
    "支店名",
    "口座種別",
    "口座番号",
    "日付",
    "項目",
    "数量",
    "単価",
    "金額",
  ].join(",");

  const rows: string[] = [];

  // 請求書行の作成
  const invoiceRow = [
    "請求書",
    invoiceData.payee_company_name,
    invoiceData.payee_postal_code,
    invoiceData.payee_address,
    invoiceData.payee_tel || "",
    invoiceData.payee_email || "",
    invoiceData.payee_person_name || "",
    invoiceData.payer_company_name,
    invoiceData.invoice_date,
    invoiceData.due_date,
    invoiceData.invoice_number,
    invoiceData.total_amount,
    invoiceData.sub_total_amount,
    invoiceData.total_tax_amount,
    invoiceData.bank_name || "",
    invoiceData.bank_account_name || "",
    invoiceData.bank_store_type || "",
    invoiceData.band_type || "",
    invoiceData.bank_number || "",
    "", // 日付
    "", // 項目
    "", // 数量
    "", // 単価
    "", // 金額
  ].join(",");
  rows.push(invoiceRow);

  // 明細行の作成
  invoiceData.invoice_details.forEach((detail) => {
    const detailRow = [
      "品目",
      "", // 請求元会社名
      "", // 請求元郵便番号
      "", // 請求元住所
      "", // 請求元電話番号
      "", // 請求元メール
      "", // 請求元担当者
      "", // 請求先会社名
      "", // 請求日
      "", // 支払期日
      "", // 請求書番号
      "", // 合計金額
      "", // 小計
      "", // 消費税
      "", // 銀行名
      "", // 口座名義
      "", // 支店名
      "", // 口座種別
      "", // 口座番号
      detail.item_date,
      detail.item_description,
      detail.item_quantity,
      detail.item_unit_price,
      detail.item_amount,
    ].join(",");
    rows.push(detailRow);
  });

  return [headers, ...rows].join("\n");
}
