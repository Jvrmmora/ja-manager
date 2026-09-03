import { apiRequest, buildApiUrl } from './api';

export interface PrivacyPolicy {
  version: string;
  currentVersion: string;
  isCurrent: boolean;
  effectiveDate: string;
  contactEmail: string;
  hash: string;
  contentMarkdown: string;
}

export interface ConsentStatus {
  status: 'none' | 'current' | 'pending_reconsent';
  requiresConsent: boolean;
  currentVersion: string;
  effectiveDate: string;
  contactEmail: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  history: Array<{
    id: string;
    policyVersion: string;
    acceptedAt: string;
    channel: string;
    isMinor: boolean;
  }>;
}

export interface AcceptConsentPayload {
  policyVersion: string;
  guardianFullName?: string | undefined;
  guardianRelationship?: string | undefined;
}

/** Consulta pública de la política de privacidad vigente. */
export async function fetchPrivacyPolicy(): Promise<PrivacyPolicy> {
  // `no-cache`: obliga a revalidar contra el servidor (que responde 304 si el
  // texto no cambió), evitando servir una copia obsoleta desde el navegador.
  const res = await fetch(buildApiUrl('legal/privacy-policy'), {
    cache: 'no-cache',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudo cargar la política de privacidad');
  }
  return data.data as PrivacyPolicy;
}

/** Estado de consentimiento del usuario autenticado. */
export async function fetchMyConsent(): Promise<ConsentStatus> {
  const res = await apiRequest('consent/me', { method: 'GET' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudo obtener el estado de consentimiento');
  }
  return data.data as ConsentStatus;
}

/** El usuario autenticado acepta la versión vigente de la política. */
export async function acceptConsent(
  payload: AcceptConsentPayload
): Promise<void> {
  const res = await apiRequest('consent/accept', {
    method: 'POST',
    body: JSON.stringify({ acceptPrivacyPolicy: true, ...payload }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudo registrar el consentimiento');
  }
}

/** El usuario decide no aceptar. Devuelve el correo de contacto. */
export async function declineConsent(): Promise<{ contactEmail: string }> {
  const res = await apiRequest('consent/decline', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  return { contactEmail: data?.data?.contactEmail || '' };
}
