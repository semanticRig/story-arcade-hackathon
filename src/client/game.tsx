import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DailyArcadeScreen } from './components/DailyArcadeScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App = () => {
  return (
    <ErrorBoundary>
      <DailyArcadeScreen />
    </ErrorBoundary>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
