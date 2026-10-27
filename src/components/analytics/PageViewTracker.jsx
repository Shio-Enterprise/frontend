import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EVENT_TYPES, trackEvent } from '../../lib/analytics';

// Registra uma visualização de página sempre que a rota muda.
const PageViewTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    trackEvent(EVENT_TYPES.PAGE_VIEW, { path: pathname });
  }, [pathname]);

  return null;
};

export default PageViewTracker;
