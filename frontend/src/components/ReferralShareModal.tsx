import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import BrandModalHeader from './ui/BrandModalHeader';
import { seasonService } from '../services/seasonService';
import { copyText } from '../utils/clipboard';
import { buildReferralUrl, referralShareMessage } from '../utils/shareUrls';

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPlaca: string;
  /** Puntos de quien invita si no se puede leer la temporada activa. */
  referralPoints?: number;
}

type CopyTarget = 'placa' | 'link' | 'message';

interface ReferralRewards {
  bonus: number; // para quien invita
  welcome: number | null; // para el nuevo joven
  seasonActive: boolean;
}

// Modal "Invita amigos": comparte tu placa / enlace de registro por WhatsApp o
// Instagram. Los puntos se leen de la temporada activa (son distintos para
// quien invita y para quien se registra).
const ReferralShareModal: React.FC<ReferralShareModalProps> = ({
  isOpen,
  onClose,
  userPlaca,
  referralPoints = 30,
}) => {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [instagramReady, setInstagramReady] = useState(false);
  const [rewards, setRewards] = useState<ReferralRewards | null>(null);

  const referralLink = buildReferralUrl(userPlaca);
  const readableLink = referralLink
    .replace(/^https?:\/\//, '')
    .replace(encodeURIComponent(userPlaca), userPlaca);
  const invitationMessage = referralShareMessage(
    referralLink,
    userPlaca,
    rewards?.welcome ?? undefined
  );
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    seasonService
      .getActive()
      .then(season => {
        if (!alive) return;
        setRewards(
          season?.settings
            ? {
                bonus: season.settings.referralBonusPoints,
                welcome: season.settings.referralWelcomePoints,
                seasonActive: true,
              }
            : { bonus: referralPoints, welcome: null, seasonActive: false }
        );
      })
      .catch(() => {
        if (alive) setRewards({ bonus: referralPoints, welcome: null, seasonActive: true });
      });
    return () => {
      alive = false;
    };
  }, [isOpen, referralPoints]);

  // ESC cierra y el fondo no se desplaza mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async (target: CopyTarget) => {
    const text =
      target === 'placa' ? userPlaca : target === 'link' ? referralLink : invitationMessage;
    if (await copyText(text)) {
      setCopied(target);
      setTimeout(() => setCopied(c => (c === target ? null : c)), 1800);
    }
  };

  // Instagram no permite compartir texto por enlace: se copia el mensaje y se
  // ofrece abrir los mensajes directos para pegarlo.
  const handleInstagram = async () => {
    if (await copyText(invitationMessage)) setInstagramReady(true);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'Únete a Jóvenes Modelia',
        text: invitationMessage.replace(referralLink, '').trim(),
        url: referralLink,
      });
    } catch {
      // El usuario canceló el menú nativo
    }
  };

  const tile =
    'group flex flex-col items-center gap-2 rounded-[20px] border border-sand-200 bg-white px-2 py-3.5 text-[13px] font-semibold text-cocoa-700 transition-all hover:-translate-y-0.5 hover:border-sand-300 hover:shadow-[0_14px_30px_-18px_rgba(78,15,58,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange dark:border-white/10 dark:bg-white/[0.04] dark:text-white/85 dark:hover:border-white/20';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[#0C0609]/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px] dark:bg-ink-900"
        role="dialog"
        aria-modal="true"
        aria-label="Invita amigos"
      >
        <BrandModalHeader
          title="Invita amigos"
          subtitle="Comparte tu placa y ganen puntos juntos"
          icon={<UserPlusIcon className="h-5 w-5" />}
          onClose={onClose}
        />

        <div className="flex flex-col gap-5 overflow-y-auto p-5 sm:p-6">
          {/* Recompensas */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tú ganas', value: rewards?.bonus },
                { label: 'Tu amigo gana', value: rewards?.welcome },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-[20px] border border-sand-200 bg-sand-50 px-3 py-4 text-center dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cocoa-400 dark:text-white/50">
                    {label}
                  </span>
                  <span className="mt-1.5 font-display text-[40px] font-bold leading-none text-brand-deep dark:text-brand-amber">
                    {rewards ? (value != null ? `+${value}` : '—') : '…'}
                  </span>
                  <span className="mt-1 text-xs text-cocoa-400 dark:text-white/45">puntos</span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-2.5 text-center text-xs text-cocoa-400 dark:text-white/45">
              {rewards && !rewards.seasonActive
                ? 'Ahora no hay temporada activa, así que las invitaciones no suman puntos.'
                : 'Se suman apenas tu amigo se registre con tu placa.'}
            </p>
          </div>

          {/* Placa y enlace */}
          <div className="flex flex-col gap-3 rounded-[20px] border border-sand-200 p-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cocoa-400 dark:text-white/50">
                  Tu placa de invitación
                </span>
                <span className="truncate font-display text-[26px] font-semibold leading-tight tracking-[0.03em] text-cocoa-900 dark:text-white">
                  {userPlaca}
                </span>
              </span>
              <CopyButton active={copied === 'placa'} onClick={() => handleCopy('placa')} label="Copiar placa" />
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-sand-50 py-2 pl-3.5 pr-2 dark:bg-ink-800">
              <LinkIcon className="h-4 w-4 flex-shrink-0 text-brand-deep dark:text-brand-amber" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-cocoa-600 dark:text-white/70" title={referralLink}>
                {readableLink}
              </span>
              <CopyButton active={copied === 'link'} onClick={() => handleCopy('link')} label="Copiar enlace" text="Copiar" />
            </div>
          </div>

          {/* Compartir */}
          <div>
            <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-cocoa-400 dark:text-white/50">
              Comparte en
            </p>
            <div className={`grid gap-3 ${canNativeShare ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(invitationMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={tile}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_-10px_rgba(37,211,102,0.8)]">
                  <WhatsappIcon className="h-6 w-6" />
                </span>
                WhatsApp
              </a>
              <button type="button" onClick={handleInstagram} className={tile}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_107%,#FDF497_0%,#FDF497_5%,#FD5949_45%,#D6249F_60%,#285AEB_90%)] text-white shadow-[0_10px_24px_-10px_rgba(214,36,159,0.8)]">
                  <InstagramIcon className="h-6 w-6" />
                </span>
                Instagram
              </button>
              {canNativeShare && (
                <button type="button" onClick={handleNativeShare} className={tile}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-950 text-white shadow-[0_10px_24px_-12px_rgba(20,11,16,0.8)] dark:bg-white/15">
                    <ShareIcon className="h-5 w-5" />
                  </span>
                  Más
                </button>
              )}
            </div>

            {instagramReady && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-[13px] text-emerald-800 dark:text-emerald-200">
                <CheckIcon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Mensaje copiado. Pégalo en un chat de Instagram.</span>
                <a
                  href="https://www.instagram.com/direct/inbox/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 font-bold underline underline-offset-2"
                >
                  Abrir Instagram
                </a>
              </div>
            )}
          </div>

          {/* Vista previa del mensaje */}
          <div className="rounded-[20px] bg-sand-50 p-4 dark:bg-white/[0.04]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cocoa-400 dark:text-white/50">
                Mensaje
              </span>
              <button
                type="button"
                onClick={() => handleCopy('message')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-deep transition-colors hover:text-brand-red dark:text-brand-amber"
              >
                {copied === 'message' ? (
                  <>
                    <CheckIcon className="h-3.5 w-3.5" /> Copiado
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-3.5 w-3.5" /> Copiar mensaje
                  </>
                )}
              </button>
            </div>
            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-cocoa-700 dark:text-white/75">
              {formatWhatsAppBold(invitationMessage)}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Muestra los *negritas* de WhatsApp como negrita en la vista previa
const formatWhatsAppBold = (text: string) =>
  text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <strong key={i} className="font-semibold text-cocoa-900 dark:text-white">
        {part.slice(1, -1)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );

const CopyButton: React.FC<{ active: boolean; onClick: () => void; label: string; text?: string }> = ({
  active,
  onClick,
  label,
  text,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`inline-flex h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
      text ? 'px-3.5' : 'w-10'
    } ${
      active
        ? 'bg-emerald-500 text-white'
        : 'bg-ink-950 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-white/85'
    }`}
  >
    {active ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
    {text && <span>{active ? 'Copiado' : text}</span>}
  </button>
);

const UserPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.44 1.32 4.94L2.05 22l5.29-1.38a9.87 9.87 0 0 0 4.7 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.06h-.01a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.15 8.15 0 0 1-1.25-4.31c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.67 8.16-8.12 8.16Zm4.47-6.12c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.78.97-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.95-1.21-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

export default ReferralShareModal;
