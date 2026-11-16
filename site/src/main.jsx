import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/sections.css';

const root = document.getElementById('root');

/* 404.html собирается отдельной страницей и помечается data-page="404":
   адрес у неё произвольный, по пути её не узнать. */
const notFound = document.documentElement.dataset.page === '404';

/* Сборка с prerender кладёт статическую разметку внутрь #root — её нужно
   оживить, а не перерисовать. В dev и при PRERENDER=0 контейнер пустой. */
if (root.hasChildNodes()) hydrateRoot(root, <App notFound={notFound} />);
else createRoot(root).render(<App notFound={notFound} />);
