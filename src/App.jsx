import AppRoutes from './routes/AppRoutes.jsx';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <div style={{ width: '100vw', minHeight: '100vh', margin: 0, padding: 0, overflowX: 'hidden' }}>
        <AppRoutes />
        <Toaster 
          position="top-right" 
          containerStyle={{
            zIndex: 9999999999, 
          }}
          toastOptions={{ 
            style: { 
              background: '#2d314d', 
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)'
            } 
          }} 
        />
      </div>
    </ErrorBoundary>
  );
}