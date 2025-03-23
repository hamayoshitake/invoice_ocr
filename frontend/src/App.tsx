// src/App.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.scss';
import DownloadInvoiceCsvForm from './components/DownloadInvoiceCsvForm';
import InvoiceOcr from './pages/invoice-ocr-api';
import { getAnalytics } from "firebase/analytics";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';


const reactAppNodeEnv = import.meta.env.REACT_APP_NODE_ENV

if (reactAppNodeEnv === 'prod') {
  getAnalytics();
}

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar navbar-expand-lg navbar-light bg-light mb-0">
          <div className="container" style={{ paddingLeft: '60px' , paddingRight: '60px' }}>
            <Link className="navbar-brand" to="/">ホーム</Link>
            <div className="navbar-nav">
              <Link className="nav-link" to="/invoice/csv">請求書csv出力</Link>
              <Link className="nav-link" to="/invoice/ocr">請求書OCRテスト</Link>
            </div>
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={
              <div className="text-center">
                <h1>ホームページ</h1>
                <p>アップロードしたいファイルの種類を選択してください</p>
              </div>
            } />
            <Route path="/invoice/csv" element={<DownloadInvoiceCsvForm />} />
            <Route path="/invoice/ocr" element={<InvoiceOcr />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;