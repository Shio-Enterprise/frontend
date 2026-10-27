import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordNavigationEvent } from '../lib/navigationAnalytics';

export default function NavigationTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    recordNavigationEvent({ eventType: 'PAGE_VIEW', path: pathname });
  }, [pathname]);

  return null;
}
