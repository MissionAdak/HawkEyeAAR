import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/share-tech-mono/400.css';
import './index.css';

import { HashRouter } from 'react-router-dom';
import { Console } from './ui/Console';
import { ErrorBoundary } from './ui/ErrorBoundary';

const RootApp: React.FC = () => {
  return <Console />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="TACTICAL CONSOLE INITIALIZATION ERROR">
      <HashRouter>
        <RootApp />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
