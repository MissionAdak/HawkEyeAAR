import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/share-tech-mono/400.css';
import './index.css';

import { Console } from './ui/Console';
import { useSessionStore } from './store/sessionStore';
import demo1Spec from './director/bundled/demo1.json';
import type { ScenarioSpec } from './sim/types';

const RootApp: React.FC = () => {
  const loadScenario = useSessionStore((s) => s.loadScenario);

  useEffect(() => {
    // Automatically load bundled DEMO-1 scenario on boot
    loadScenario(demo1Spec as unknown as ScenarioSpec);
  }, [loadScenario]);

  return <Console />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
