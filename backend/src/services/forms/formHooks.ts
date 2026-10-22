import { IFormDocument } from '../../models/Form';
import { IFormResponseDocument } from '../../models/FormResponse';
import logger from '../../utils/logger';

/**
 * Punto de extensión para reaccionar a respuestas guardadas (p.ej. la
 * sincronización con Google Sheets) sin acoplar formResponseService a cada
 * integración. Los listeners corren después de responder y sus errores
 * nunca afectan al usuario que envió el formulario.
 */
type ResponseSavedListener = (
  form: IFormDocument,
  response: IFormResponseDocument,
  info: { updated: boolean }
) => Promise<void> | void;

const listeners: ResponseSavedListener[] = [];

export const onResponseSaved = (listener: ResponseSavedListener): void => {
  listeners.push(listener);
};

export const notifyResponseSaved = (
  form: IFormDocument,
  response: IFormResponseDocument,
  info: { updated: boolean }
): void => {
  for (const listener of listeners) {
    setImmediate(() => {
      Promise.resolve(listener(form, response, info)).catch(error =>
        logger.error('Error en listener de respuesta de formulario', {
          context: 'FormHooks',
          formId: String(form._id),
          error: error?.message,
        })
      );
    });
  }
};

/** Solo para pruebas. */
export const __resetResponseListeners = (): void => {
  listeners.length = 0;
};
