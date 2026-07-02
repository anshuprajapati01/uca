import AppRoutes from './routes/AppRoutes.jsx';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
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
  );
}