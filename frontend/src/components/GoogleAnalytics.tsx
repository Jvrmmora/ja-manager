  import { useEffect } from 'react';
  import { useLocation } from 'react-router-dom';

  declare global {
    interface Window {
      dataLayer: unknown[];
      gtag: (...args: unknown[]) => void;
    }
  }

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  export default function GoogleAnalytics() {
    const location = useLocation();

    useEffect(() => {
      if (!measurementId || document.querySelector(`script[data-ga="${measurementId}"]`)) {
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.gtag = (...args: unknown[]) => {
        window.dataLayer.push(args);
      };
      window.gtag('js', new Date());
      window.gtag('config', measurementId, { send_page_view: false });

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.dataset.ga = measurementId;
      document.head.appendChild(script);
    }, []);

    useEffect(() => {
      const isPrivateRoute =
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/dashboard');

      if (!measurementId || isPrivateRoute || !window.gtag) {
        return;
      }

      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: `${location.pathname}${location.search}`,
      });
    }, [location]);

    return null;
  }
