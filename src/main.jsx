import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css'; // Importing here as well or instead of App.jsx is fine, but usually one place.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
