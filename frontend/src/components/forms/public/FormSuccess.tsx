import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicForm, SubmitResult } from '../../../types/forms';
import {
  buildGoogleCalendarUrl,
  formatEventDate,
  formatEventTime,
} from '../../../utils/forms/eventFormat';
import { buildFormShareUrl, formShareMessage } from '../../../utils/shareUrls';
import ShareLinkButton from '../../ShareLinkButton';
import { CalendarIcon, FlameIcon, PinIcon } from './FormIcons';
import { statusPrimaryBtn, statusSecondaryBtn } from '../../StatusScreen';
import { REGISTRATION_PREFILL_KEY } from '../../../utils/forms/registrationPrefill';

interface FormSuccessProps {
  form: PublicForm;
  result: SubmitResult;
  firstName?: string | undefined;
  /** Datos del invitado para precargar el registro. */
  guestPrefill?: { fullName?: string; phone?: string; email?: string } | undefined;
  onEdit?: (() => void) | undefined;
}

const FormSuccess: React.FC<FormSuccessProps> = ({ form, result, firstName, guestPrefill, onEdit }) => {
  const navigate = useNavigate();
  const shareUrl = buildFormShareUrl(form.slug);
  const when = form.event.startsAt
    ? `${formatEventDate(form.event.startsAt)} · ${formatEventTime(form.event.startsAt)}`
    : null;
  const calendarUrl = result.attending !== false ? buildGoogleCalendarUrl(form.title, form.event, shareUrl) : null;
  const going = result.attending === true;

  useEffect(() => {
    if (result.pointsAwarded <= 0) return;
    import('canvas-confetti').then(({ default: confetti }) =>
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors: ['#F9A23B', '#F26A2E', '#DC3340', '#8A1C45'] })
    );
  }, [result.pointsAwarded]);

  const title = result.updated
    ? 'Respuesta actualizada'
    : going
      ? `¡Te esperamos${firstName ? `, ${firstName}` : ''}!`
      : result.attending === false
        ? `Gracias por avisarnos${firstName ? `, ${firstName}` : ''}`
        : '¡Respuesta enviada!';

  const subtitle = going
    ? 'Tu asistencia quedó confirmada.'
    : result.attending === false
      ? 'Te vamos a extrañar. Si cambias de opinión, puedes actualizar tu respuesta.'
      : 'Recibimos tus respuestas.';

  const goRegister = () => {
    try {
      if (guestPrefill) sessionStorage.setItem(REGISTRATION_PREFILL_KEY, JSON.stringify(guestPrefill));
    } catch {
      /* almacenamiento bloqueado: el registro abre vacío */
    }
    navigate('/register');
  };

  return (
    <div className="rounded-[28px] border border-sand-200 bg-white p-6 text-center shadow-[0_30px_60px_-40px_rgba(78,15,58,0.4)] dark:border-white/10 dark:bg-ink-900 sm:p-9">
      <div className="bg-fire mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_14px_40px_-10px_rgba(242,106,46,0.8)]">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mb-1 mt-5 font-display text-3xl font-semibold uppercase text-cocoa-900 dark:text-white">{title}</h2>
      <p className="m-0 text-[15px] text-cocoa-500 dark:text-white/65">{subtitle}</p>

      {result.pointsAwarded > 0 && (
        <p className="mx-auto mb-0 mt-4 inline-flex items-center gap-2 rounded-full bg-brand-amber/15 px-4 py-2 font-semibold text-brand-deep dark:text-brand-amber">
          <FlameIcon className="h-4 w-4" />+{result.pointsAwarded} puntos por responder
        </p>
      )}

      {going && (when || form.event.location) && (
        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-cream px-5 py-4 text-left text-sm dark:bg-white/[0.05]">
          <p className="m-0 font-semibold text-cocoa-900 dark:text-white">{form.title}</p>
          {when && (
            <p className="m-0 mt-1.5 flex items-center gap-2 text-cocoa-600 dark:text-white/70">
              <CalendarIcon className="h-4 w-4 flex-shrink-0 text-brand-deep dark:text-brand-amber" />
              {when}
            </p>
          )}
          {form.event.location && (
            <p className="m-0 mt-1.5 flex items-center gap-2 text-cocoa-600 dark:text-white/70">
              <PinIcon className="h-4 w-4 flex-shrink-0 text-brand-deep dark:text-brand-amber" />
              {form.event.location}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {calendarUrl && (
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className={statusPrimaryBtn}>
            Agregar a mi calendario
          </a>
        )}
        {onEdit && (
          <button type="button" onClick={onEdit} className={statusSecondaryBtn}>
            Editar mi respuesta
          </button>
        )}
      </div>

      <div className="mx-auto mt-6 flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-ink-950 px-4 py-3 text-left">
        <span className="text-sm text-white/80">¿Invitas a alguien más?</span>
        <ShareLinkButton
          url={shareUrl}
          title={form.title}
          message={formShareMessage(shareUrl, form.title, when)}
          alwaysShowLabel
        />
      </div>

      {result.kind === 'guest' && form.settings.showRegisterCta && (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-orange/40 px-5 py-4 text-sm text-cocoa-600 dark:text-white/75">
          <p className="m-0">
            <strong className="text-cocoa-900 dark:text-white">Crea tu cuenta</strong> y la próxima vez solo escribes tu
            placa: tus datos se llenan solos y ganas puntos.
          </p>
          <button type="button" onClick={goRegister} className={`${statusSecondaryBtn} mt-3 h-11`}>
            Crear mi cuenta
          </button>
        </div>
      )}
    </div>
  );
};

export default FormSuccess;
