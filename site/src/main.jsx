import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/sections.css';

const root = document.getElementById('root');

/* Сборка с prerender кладёт статическую разметку внутрь #root — её нужно
   оживить, а не перерисовать. В dev и при PRERENDER=0 контейнер пустой. */
if (root.hasChildNodes()) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
