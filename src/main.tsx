import ReactDOM from 'react-dom/client';
import {
  BrowserRouter as Router,
} from 'react-router-dom';
import App from './App';
import './css/style.css';
import './css/satoshi.css';
import 'jsvectormap/dist/css/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import store from './store';
import { Provider } from 'react-redux';
import AuthProvider from './pages/Authentication/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import 'leaflet/dist/leaflet.css'


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Router>
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  </Router>,
);
