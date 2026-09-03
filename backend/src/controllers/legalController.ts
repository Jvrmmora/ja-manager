import { Request, Response } from 'express';
import { asyncHandler, NotFoundError } from '../utils/errorHandler';
import { ApiResponse } from '../types';
import {
  CURRENT_POLICY_VERSION,
  getPrivacyPolicy,
  isSupportedPolicyVersion,
} from '../config/privacyPolicy';

export class LegalController {
  /**
   * Devuelve la política de privacidad vigente (o una versión específica).
   * Pública: cualquiera puede consultar la política en cualquier momento.
   */
  static getPrivacyPolicy = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const requested = req.params.version;
      const version = requested || CURRENT_POLICY_VERSION;

      if (requested && !isSupportedPolicyVersion(requested)) {
        throw new NotFoundError('Versión de la política de privacidad');
      }

      const policy = getPrivacyPolicy(version);

      // El ETag (por hash del contenido) permite respuestas 304 baratas.
      // - Versión concreta: su contenido nunca cambia -> caché largo.
      // - Versión vigente ("current"): puede cambiar de texto sin subir el
      //   número de versión, así que se revalida siempre (no-cache) para no
      //   servir una copia obsoleta desde el navegador.
      res.set('ETag', `"${policy.hash}"`);
      res.set(
        'Cache-Control',
        requested ? 'public, max-age=31536000, immutable' : 'no-cache'
      );

      if (req.headers['if-none-match'] === `"${policy.hash}"`) {
        res.status(304).end();
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Política de privacidad obtenida exitosamente',
        data: {
          version: policy.version,
          currentVersion: CURRENT_POLICY_VERSION,
          isCurrent: policy.version === CURRENT_POLICY_VERSION,
          effectiveDate: policy.effectiveDate,
          contactEmail: policy.contactEmail,
          hash: policy.hash,
          contentMarkdown: policy.contentMarkdown,
        },
      } as ApiResponse);
    }
  );
}
