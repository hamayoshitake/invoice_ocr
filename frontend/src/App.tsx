// src/App.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.scss';
import InvoiceUploadForm from './components/InvoiceUploadForm';

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