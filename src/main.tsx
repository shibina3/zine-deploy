import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './app/providers/AppProviders';
import { AppRoutes } from './app/routes/AppRoutes';
import './styles/globals.css';

// GitHub Pages project sites live under /<repo>/. BASE_URL keeps routing working
// for both the local root build and a sub-path deployment.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);
