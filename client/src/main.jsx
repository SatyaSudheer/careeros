import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { initUiScale } from './uiScale.js';
import './index.css';

// Apply the saved interface scale before the first paint
initUiScale();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
