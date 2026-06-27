import AppRoutes from './routes/AppRoutes.jsx';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster 
        position="top-right" 
        /* 👉 YE LINE SABSE ZAROORI HAI - YE PURE TOAST SYSTEM KO SABSE AAGE LAYEGI */
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
    </>
  );
}