// src/App.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.scss';
import InvoiceUploadForm from './components/InvoiceUploadForm';
import { getAnalytics } from "firebase/analytics";

if (process.env.REACT_APP_NODE_ENV === 'production') {
  getAnalytics();
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <InvoiceUploadForm />
      </header>
    </div>
  );
}

export default App;