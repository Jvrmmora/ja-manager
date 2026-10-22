import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageLoader from '../../components/PageLoader';
import PublicTopBar from '../../components/PublicTopBar';
import Seo from '../../components/Seo';
import StatusScreen, { statusPrimaryBtn } from '../../components/StatusScreen';
import EventHero from '../../components/forms/public/EventHero';
import IdentityStep, { type IdentityMode } from '../../components/forms/public/IdentityStep';
import QuestionField from '../../components/forms/public/QuestionField';
import FormSuccess from '../../components/forms/public/FormSuccess';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/auth';
import {
  fetchPublicForm,
  FormsApiError,
  identifyWithPlaca,
  submitFormResponse,
} from '../../services/formsApi';
import type {
  AnswerMap,
  AnswerValue,
  ContactField,
  ContactValues,
  PlacaIdentity,
  PublicFormData,
  SubmitResult,
} from '../../types/forms';
import { resolveVisibility, validateSection } from '../../utils/forms/conditions';
import { buildLoginRedirect } from '../../utils/loginUrl';

type FieldErrors = Partial<Record<ContactField, string>>;

interface Draft {
  answers: AnswerMap;
  contact: ContactValues;
  mode: IdentityMode;
  placa?: string;
}

const draftKey = (slug: string) => `formDraft:${slug}`;

// El borrador sobrevive al ir a iniciar sesión y volver (sessionStorage).
const readDraft = (slug: string): Draft | null => {
  try {
    const raw = sessionStorage.getItem(draftKey(slug));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (slug: string, draft: Draft) => {
  try {
    sessionStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    /* almacenamiento bloqueado: no pasa nada */
  }
};
const clearDraft = (slug: string) => {
  try {
    sessionStorage.removeItem(draftKey(slug));
  } catch {
    /* noop */
  }
};

const isBlank = (value: unknown) => value === undefined || value === null || String(value).trim() === '';

const cardCls =
  'rounded-[28px] border border-sand-200 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(78,15,58,0.4)] dark:border-white/10 dark:bg-ink-900 sm:p-8';

const Notice: React.FC<{ tone?: 'info' | 'warn'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div
    className={`rounded-2xl px-4 py-3 text-[15px] font-medium ${
      tone === 'warn' ? 'bg-brand-red/20 text-white' : 'bg-white/10 text-white/90'
    }`}
  >
    {children}
  </div>
);

/**
 * Formulario público de evento (/f/:slug). Tres caminos para identificarse:
 * sesión (autollenado), placa (datos enmascarados) o invitado.
 */
export default function PublicFormPage() {
  const { slug = '' } = useParams();
  const { isDark } = useTheme();
  const topRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<PublicFormData | null>(null);
  const [loadError, setLoadError] = useState<'notfound' | 'error' | null>(null);
  const [mode, setMode] = useState<IdentityMode>('placa');
  const [placaIdentity, setPlacaIdentity] = useState<PlacaIdentity | null>(null);
  const [contact, setContact] = useState<ContactValues>({});
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [step, setStep] = useState(0);
  const [contactErrors, setContactErrors] = useState<FieldErrors>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const load = useCallback(async () => {
    try {
      const loaded = await fetchPublicForm(slug);
      setData(loaded);
      const draft = readDraft(slug);
      if (loaded.me) {
        setMode('session');
        setAnswers(draft?.answers ?? loaded.myResponse?.answers ?? {});
        setContact(draft?.contact ?? {});
      } else {
        setAnswers(draft?.answers ?? {});
        setContact(draft?.contact ?? {});
        const draftMode = draft?.mode === 'guest' && loaded.form.settings.allowGuests ? 'guest' : 'placa';
        setMode(draftMode);
        if (draft?.mode === 'placa' && draft.placa) {
          identifyWithPlaca(slug, draft.placa).then(setPlacaIdentity).catch(() => undefined);
        }
      }
    } catch (error) {
      setLoadError(error instanceof FormsApiError && error.status === 404 ? 'notfound' : 'error');
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Guardar borrador mientras responde
  useEffect(() => {
    if (!data || result) return;
    writeDraft(slug, {
      answers,
      contact,
      mode,
      ...(placaIdentity ? { placa: placaIdentity.placa } : {}),
    });
  }, [slug, data, answers, contact, mode, placaIdentity, result]);

  const visibility = useMemo(
    () => resolveVisibility(data?.form.sections ?? [], answers),
    [data, answers]
  );
  const steps = visibility.sections.filter(section => section.questions.length > 0);
  const lastStep = Math.max(0, steps.length - 1);
  const currentStep = Math.min(step, lastStep);
  const section = steps[currentStep];

  if (loadError === 'notfound') {
    return (
      <StatusScreen
        eyebrow="Formulario"
        title="No encontramos este formulario"
        description="Puede que el enlace esté incompleto o que el formulario ya no exista. Pide el enlace de nuevo a quien te lo compartió."
        actions={
          <a href="/" className={statusPrimaryBtn}>
            Ir al inicio
          </a>
        }
      />
    );
  }
  if (loadError === 'error') {
    return (
      <StatusScreen
        eyebrow="Formulario"
        title="No pudimos cargar el formulario"
        description="Revisa tu conexión e intenta de nuevo."
        actions={
          <button type="button" onClick={() => window.location.reload()} className={statusPrimaryBtn}>
            Reintentar
          </button>
        }
      />
    );
  }
  if (!data) return <PageLoader />;

  const { form, availability, me, myResponse } = data;
  const required = new Set(form.contactFields.filter(c => c.mode === 'required').map(c => c.field));
  const canAnswer =
    availability === 'open' || availability === 'draft' || (availability === 'full' && !!myResponse);

  const fieldsToSend = (): ContactField[] => {
    if (mode === 'session') return me?.missing ?? [];
    if (mode === 'placa') return placaIdentity?.missing ?? [];
    return form.contactFields.map(c => c.field);
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const validateIdentity = (): boolean => {
    const errors: FieldErrors = {};
    setIdentityError(null);
    if (mode === 'placa' && !placaIdentity) {
      setIdentityError('Escribe tu placa y pulsa "Usar", o responde como invitado.');
      return false;
    }
    for (const field of fieldsToSend()) {
      if (required.has(field) && isBlank(contact[field])) errors[field] = 'Este dato es obligatorio';
    }
    if (mode === 'guest' && !acceptPolicy) setIdentityError('Debes aceptar la política de privacidad');
    setContactErrors(errors);
    return Object.keys(errors).length === 0 && !(mode === 'guest' && !acceptPolicy);
  };

  const validateCurrent = (): boolean => {
    const identityOk = currentStep === 0 ? validateIdentity() : true;
    const errors = section ? validateSection(section, answers) : {};
    setAnswerErrors(errors);
    return identityOk && Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (!validateCurrent()) return;
    setStep(currentStep + 1);
    scrollTop();
  };

  const submit = async () => {
    if (!validateCurrent()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payloadContact: ContactValues = {};
      for (const field of fieldsToSend()) {
        if (!isBlank(contact[field])) payloadContact[field] = contact[field]!.trim();
      }
      const response = await submitFormResponse(slug, {
        ...(mode === 'placa' && placaIdentity ? { placa: placaIdentity.placa } : {}),
        contact: payloadContact,
        answers: visibility.effectiveAnswers,
        ...(mode === 'guest' ? { acceptPolicy } : {}),
        ...(mode === 'session' ? { saveToProfile } : {}),
      });
      clearDraft(slug);
      setResult(response);
      scrollTop();
    } catch (error) {
      if (error instanceof FormsApiError && error.details) {
        const contactDetails = (error.details.contact || {}) as FieldErrors;
        const answerDetails = error.details.answers || {};
        setContactErrors(contactDetails);
        setAnswerErrors(answerDetails);
        const firstAnswer = Object.keys(answerDetails)[0];
        const target = Object.keys(contactDetails).length
          ? 0
          : Math.max(0, steps.findIndex(s => s.questions.some(q => q.id === firstAnswer)));
        setStep(target);
        if ('acceptPolicy' in contactDetails) setIdentityError(String(contactDetails.acceptPolicy as string));
      }
      setSubmitError(error instanceof Error ? error.message : 'No pudimos enviar tu respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.dispatchEvent(new Event('userInfoUpdated'));
    setPlacaIdentity(null);
    setContact({});
    setData(null);
    await load();
  };

  const setAnswer = (questionId: string, value: AnswerValue | undefined) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (value === undefined) delete next[questionId];
      else next[questionId] = value;
      return next;
    });
    setAnswerErrors(prev => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const notice =
    availability === 'draft' ? (
      <Notice>👀 Vista previa: este formulario aún no está publicado.</Notice>
    ) : availability === 'closed' ? (
      <Notice tone="warn">Las inscripciones para este evento ya cerraron.</Notice>
    ) : availability === 'full' ? (
      <Notice tone="warn">
        Se agotaron los cupos.{myResponse ? ' Aún puedes actualizar tu respuesta.' : ''}
      </Notice>
    ) : myResponse && !result ? (
      <Notice>✅ Ya respondiste este formulario. Puedes cambiar tu respuesta cuando quieras.</Notice>
    ) : null;

  const firstName =
    me?.fullName.split(' ')[0] ||
    placaIdentity?.shortName.split(' ')[0] ||
    contact.fullName?.trim().split(' ')[0];

  return (
    <div className={`flex min-h-screen flex-col bg-cream dark:bg-ink-950 ${isDark ? 'dark' : ''}`}>
      <Seo
        title={`${form.title} — Jóvenes Modelia`}
        description={`Confirma tu asistencia a ${form.title}.`}
        noindex
      />
      <PublicTopBar />
      <EventHero form={form} notice={notice} />

      <main ref={topRef} className="relative mx-auto -mt-12 w-full max-w-2xl scroll-mt-4 px-4 pb-16 sm:px-6">
        {result ? (
          <FormSuccess
            form={form}
            result={result}
            firstName={firstName}
            guestPrefill={
              result.kind === 'guest'
                ? {
                    ...(contact.fullName ? { fullName: contact.fullName } : {}),
                    ...(contact.phone ? { phone: contact.phone } : {}),
                    ...(contact.email ? { email: contact.email } : {}),
                  }
                : undefined
            }
            onEdit={result.kind !== 'guest' ? () => setResult(null) : undefined}
          />
        ) : canAnswer ? (
          <div className="space-y-4">
            {steps.length > 1 && (
              <div className="rounded-full bg-white/80 p-1 shadow-sm dark:bg-ink-900/80" aria-hidden="true">
                <div
                  className="bg-fire h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {currentStep === 0 && (
                  <section className={cardCls} aria-labelledby="identity-title">
                    <h2 id="identity-title" className="mb-4 mt-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
                      {mode === 'session' || placaIdentity ? 'Tus datos' : '¿Quién eres?'}
                    </h2>
                    <IdentityStep
                      form={form}
                      me={me}
                      mode={mode}
                      onModeChange={next => {
                        setMode(next);
                        setIdentityError(null);
                        setContactErrors({});
                      }}
                      placaIdentity={placaIdentity}
                      onIdentify={async placa => {
                        const identity = await identifyWithPlaca(slug, placa);
                        setPlacaIdentity(identity);
                        setIdentityError(null);
                      }}
                      onClearPlaca={() => setPlacaIdentity(null)}
                      contact={contact}
                      contactErrors={contactErrors}
                      onContactChange={(field, value) => {
                        setContact(prev => ({ ...prev, [field]: value }));
                        setContactErrors(prev => {
                          const next = { ...prev };
                          delete next[field];
                          return next;
                        });
                      }}
                      acceptPolicy={acceptPolicy}
                      onAcceptPolicy={value => {
                        setAcceptPolicy(value);
                        if (value) setIdentityError(null);
                      }}
                      saveToProfile={saveToProfile}
                      onSaveToProfile={setSaveToProfile}
                      onLogout={handleLogout}
                      loginHref={buildLoginRedirect(`/f/${slug}`)}
                      policyError={mode === 'guest' ? identityError || undefined : undefined}
                    />
                    {identityError && mode !== 'guest' && (
                      <p className="mb-0 mt-3 text-sm font-medium text-red-500">{identityError}</p>
                    )}
                  </section>
                )}

                {section && (
                  <section className={cardCls}>
                    {(section.title || section.description) && (
                      <div className="mb-6">
                        {section.title && (
                          <h2 className="m-0 font-display text-2xl font-semibold uppercase text-cocoa-900 dark:text-white">
                            {section.title}
                          </h2>
                        )}
                        {section.description && (
                          <p className="mb-0 mt-1 text-[15px] text-cocoa-500 dark:text-white/65">{section.description}</p>
                        )}
                      </div>
                    )}
                    <div className="space-y-7">
                      <AnimatePresence initial={false}>
                        {section.questions.map(question => (
                          <motion.div
                            key={question.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <QuestionField
                              question={question}
                              value={answers[question.id]}
                              error={answerErrors[question.id]}
                              onChange={value => setAnswer(question.id, value)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>

            {submitError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(currentStep - 1);
                    scrollTop();
                  }}
                  className="inline-flex h-14 items-center justify-center rounded-full border-[1.5px] border-sand-300 px-6 font-semibold text-cocoa-700 transition-colors hover:border-cocoa-400 dark:border-white/20 dark:text-white"
                >
                  Atrás
                </button>
              )}
              {currentStep < lastStep ? (
                <button type="button" onClick={goNext} className="btn-fire h-14 flex-1 text-base">
                  Siguiente · {currentStep + 2} de {steps.length}
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={submitting} className="btn-fire h-14 flex-1 text-base">
                  {submitting ? 'Enviando…' : myResponse ? 'Actualizar mi respuesta' : 'Enviar respuesta'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`${cardCls} text-center`}>
            <p className="m-0 text-[15px] text-cocoa-600 dark:text-white/75">
              Este formulario ya no recibe respuestas. Si tienes dudas, escríbenos por nuestras redes.
            </p>
            <a href="/" className={`${statusPrimaryBtn} mt-5`}>
              Ir al inicio
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
