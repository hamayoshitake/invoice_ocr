import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import GetInvoiceDataApiForm from '../components/GetInvoiceDataApiForm';
import { Phi4Analysis } from '../components/Phi4Analysis';

// 環境変数から機能の有効/無効を取得
// 開発環境（localhost）では全機能有効、本番環境では Document AI のみ有効
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const ENABLE_DOCUMENT_INTELLIGENCE = isDevelopment || import.meta.env.VITE_ENABLE_DOCUMENT_INTELLIGENCE === 'true';
const ENABLE_PHI4 = isDevelopment || import.meta.env.VITE_ENABLE_PHI4 === 'true';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function InvoiceOcr() {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // タブの設定を動的に生成
  const tabs = [
    { label: "Document AI", component: <GetInvoiceDataApiForm service="ai" />, enabled: true },
    { label: "Document Intelligence", component: <GetInvoiceDataApiForm service="intelligence" />, enabled: ENABLE_DOCUMENT_INTELLIGENCE },
    { label: "Phi-4 分析", component: <Phi4Analysis />, enabled: ENABLE_PHI4 }
  ].filter(tab => tab.enabled);


  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, index) => (
        <TabPanel key={index} value={value} index={index}>
          {tab.component}
        </TabPanel>
      ))}
    </Box>
  );
}