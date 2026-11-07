import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css'; // Importing here as well or instead of App.jsx is fine, but usually one place.

/**
 * 全域錯誤邊界：排盤運算若丟出未預期例外，顯示友善提示而非整頁白屏。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('排盤發生未預期錯誤：', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl shadow-sm p-6 text-center space-y-3">
            <h1 className="text-lg font-bold text-rose-700">排盤時發生未預期的錯誤</h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              請重新整理頁面再試一次；若持續發生，可能是某一組出生資料或輸入觸發了計算問題。
            </p>
            <p className="text-xs text-stone-400 break-all">{String(this.state.error?.message || this.state.error)}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-lg bg-stone-900 text-amber-300 text-sm font-bold hover:bg-stone-800"
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
