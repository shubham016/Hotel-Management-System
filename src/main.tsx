import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import { installApiClient } from './lib/api-client';
import { AppErrorBoundary } from './components/AppErrorBoundary';

installApiClient();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppErrorBoundary><BrowserRouter><App /></BrowserRouter></AppErrorBoundary></React.StrictMode>);
