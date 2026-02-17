import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@operator/identify/react';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider ssoKey="ab25597b6e7b41bf9302e7a9fec8378e" appSlug="collab">
      <App />
    </AuthProvider>
  </React.StrictMode>
);
