import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import GetInvoiceDataApiForm from '../components/GetInvoiceDataApiForm';
import { Phi4Analysis } from '../components/Phi4Analysis';

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
  const [documentText, setDocumentText] = useState<string>('');

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleDocumentAnalysis = (text: string) => {
    setDocumentText(text);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Document AI" {...a11yProps(0)} />
          <Tab label="Document Intelligence" {...a11yProps(1)} />
          <Tab label="Phi-4 分析" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <GetInvoiceDataApiForm service="ai" onAnalysis={handleDocumentAnalysis} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <GetInvoiceDataApiForm service="intelligence" onAnalysis={handleDocumentAnalysis} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Phi4Analysis documentText={documentText} />
      </TabPanel>
    </Box>
  );
}