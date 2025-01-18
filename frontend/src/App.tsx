// src/App.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.scss';
import InvoiceUploadForm from './components/InvoiceUploadForm';
import { getAnalytics } from "firebase/analytics";


const reactAppNodeEnv = import.meta.env.REACT_APP_NODE_ENV

if (reactAppNodeEnv === 'prod') {
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