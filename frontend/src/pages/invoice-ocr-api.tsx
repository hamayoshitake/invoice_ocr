
import { Tabs, Tab, Box } from '@mui/material';
import { useState } from 'react';
import GetInvoiceDataApiForm from '../components/GetInvoiceDataApiForm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function InvoiceOcr() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Document AI" />
          <Tab label="Document Intelligence" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Document AI の内容 */}
        <Box>
          {/* 既存のDocument AI用コンポーネント */}
          <GetInvoiceDataApiForm service="ai" />
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Document Intelligence の内容 */}
        <Box>
          {/* Document Intelligence用コンポーネント */}
          <GetInvoiceDataApiForm service="intelligence" />
        </Box>
      </TabPanel>
    </Box>
  );
}