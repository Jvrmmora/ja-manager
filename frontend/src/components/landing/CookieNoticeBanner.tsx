import { useEffect, useState } from 'react';

const COOKIE_NOTICE_KEY = 'landing_cookie_notice_ack_v1';

export default function CookieNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasAcknowledged = localStorage.getItem(COOKIE_NOTICE_KEY);
    if (!hasAcknowledged) {
      setVisible(true);
    }
  }, []);

  const acknowledge = () => {
    localStorage.setItem(COOKIE_NOTICE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-300/30 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur-md md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-relaxed text-slate-200">
            Usamos una cookie tecnica anonima para contar visitantes unicos por
            año y mejorar la experiencia del sitio.
          </p>

          <button
            onClick={acknowledge}
            className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
