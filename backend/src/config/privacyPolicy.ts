import crypto from 'crypto';
import { PRIVACY_POLICY_VERSIONS } from '../legal/privacyPolicyContent';

/**
 * Configuración de la Política de Tratamiento de Datos Personales (Ley 1581/2012).
 *
 * `CURRENT_POLICY_VERSION` es la única fuente de verdad de qué versión debe
 * aceptar un usuario. Cuando se publique una nueva versión de la política:
 *   1. Agregar la entrada en `legal/privacyPolicyContent.ts`.
 *   2. Actualizar `CURRENT_POLICY_VERSION` y `POLICY_EFFECTIVE_DATE` aquí.
 * A partir de ese momento el sistema volverá a solicitar la aceptación a todos
 * los usuarios que no tengan un consentimiento de la versión vigente.
 */

export const CURRENT_POLICY_VERSION = '1.0.0';
export const POLICY_EFFECTIVE_DATE = '2026-09-03';

/**
 * Correo de contacto para peticiones sobre datos personales. Configurable por
 * entorno para no acoplar el texto legal al código.
 */
export const PRIVACY_CONTACT_EMAIL =
  process.env.PRIVACY_CONTACT_EMAIL || 'minjuvenil.modelia@gmail.com';

export interface PrivacyPolicyPayload {
  version: string;
  effectiveDate: string;
  contentMarkdown: string;
  /** SHA-256 del texto exacto de la política, para prueba de integridad. */
  hash: string;
  contactEmail: string;
}

const hashCache = new Map<string, string>();

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function isSupportedPolicyVersion(version: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    PRIVACY_POLICY_VERSIONS,
    version
  );
}

/**
 * Devuelve el contenido y metadatos de una versión de la política. Si no se
 * indica versión, devuelve la vigente.
 */
export function getPrivacyPolicy(
  version: string = CURRENT_POLICY_VERSION
): PrivacyPolicyPayload {
  const contentMarkdown = PRIVACY_POLICY_VERSIONS[version];
  if (!contentMarkdown) {
    throw new Error(
      `No existe la versión "${version}" de la política de privacidad`
    );
  }

  let hash = hashCache.get(version);
  if (!hash) {
    hash = hashContent(contentMarkdown);
    hashCache.set(version, hash);
  }

  return {
    version,
    effectiveDate: POLICY_EFFECTIVE_DATE,
    contentMarkdown,
    hash,
    contactEmail: PRIVACY_CONTACT_EMAIL,
  };
}

/** Hash de la versión vigente (atajo para registrar evidencia de consentimiento). */
export function getCurrentPolicyHash(): string {
  return getPrivacyPolicy(CURRENT_POLICY_VERSION).hash;
}
