import Form, { IFormDocument } from '../../../models/Form';
import FormResponse, { IFormResponseDocument } from '../../../models/FormResponse';
import env from '../../../config/env';
import logger from '../../../utils/logger';
import { AppError, ErrorType, ValidationError } from '../../../utils/errorHandler';
import { buildColumns, buildRow } from '../domain/rowMapper';
import { buildResponseTable, getFormOrFail } from '../formService';
import { onResponseSaved } from '../formHooks';
import { GoogleSheetsGateway } from './googleSheetsGateway';
import { SheetsError, SheetsGateway } from './types';

/**
 * Sincronización de respuestas con Google Sheets.
 *
 * Mongo es la fuente de verdad: cada respuesta nueva se agrega como fila al
 * instante y, si algo cambia la forma de la tabla (preguntas editadas,
 * respuesta actualizada o borrada) o un envío falla, la hoja se reescribe
 * completa desde la base. Un cron reintenta lo pendiente.
 */

export const MAX_SYNC_ATTEMPTS = 5;

let gateway: SheetsGateway | null = null;

export const isSheetsConfigured = (): boolean =>
  !!gateway || !!(env.googleSheets.clientEmail && env.googleSheets.privateKey);

const getGateway = (): SheetsGateway => {
  if (gateway) return gateway;
  if (!isSheetsConfigured()) {
    throw new AppError(
      'La integración con Google Sheets no está configurada en el servidor',
      ErrorType.VALIDATION,
      503
    );
  }
  gateway = new GoogleSheetsGateway(env.googleSheets);
  return gateway;
};

/** Solo para pruebas. */
export const setSheetsGateway = (next: SheetsGateway | null): void => {
  gateway = next;
};

export const getSheetsConfig = () => ({
  configured: isSheetsConfigured(),
  serviceAccountEmail: env.googleSheets.clientEmail || null,
});

/** Acepta el enlace completo de la hoja o solo su id. */
export const parseSpreadsheetId = (input: string): string | null => {
  const text = (input || '').trim();
  const fromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(text) ? text : null;
};

const friendly = (error: unknown): string =>
  error instanceof SheetsError ? error.message : 'Error inesperado al escribir en Google Sheets';

const sheetsFilter = (form: IFormDocument) => ({
  spreadsheetId: form.sheets.spreadsheetId as string,
  sheetName: form.sheets.sheetName || 'Respuestas',
});

/** Reescribe la hoja completa desde Mongo. */
export const fullResync = async (form: IFormDocument): Promise<{ rows: number }> => {
  if (!form.sheets.spreadsheetId) throw new ValidationError('El formulario no tiene una hoja conectada');
  const { spreadsheetId, sheetName } = sheetsFilter(form);
  const startedAt = new Date();
  try {
    const table = await buildResponseTable(form);
    await getGateway().ensureSheet(spreadsheetId, sheetName);
    await getGateway().replaceAll(spreadsheetId, sheetName, table);
    await Form.updateOne(
      { _id: form._id },
      { $set: { 'sheets.lastSyncAt': new Date(), 'sheets.lastError': null, 'sheets.needsFullResync': false } }
    );
    // Solo lo que existía al empezar quedó escrito en la hoja
    await FormResponse.updateMany(
      { formId: form._id, createdAt: { $lte: startedAt } },
      { $set: { 'sheetsSync.status': 'synced', 'sheetsSync.attempts': 0, 'sheetsSync.lastError': null } }
    );
    return { rows: table.length - 1 };
  } catch (error) {
    await Form.updateOne(
      { _id: form._id },
      { $set: { 'sheets.lastError': friendly(error), 'sheets.needsFullResync': true } }
    );
    throw error;
  }
};

/** Conecta una hoja: verifica permisos, crea la pestaña y vuelca todo. */
export const connectSpreadsheet = async (formId: string, input: string) => {
  const form = await getFormOrFail(formId);
  const spreadsheetId = parseSpreadsheetId(input);
  if (!spreadsheetId) throw new ValidationError('Pega el enlace de una hoja de Google Sheets');

  let title: string;
  try {
    title = await getGateway().getSpreadsheetTitle(spreadsheetId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ValidationError(friendly(error));
  }

  form.sheets.enabled = true;
  form.sheets.spreadsheetId = spreadsheetId;
  form.sheets.sheetName = form.sheets.sheetName || 'Respuestas';
  await form.save();

  try {
    const { rows } = await fullResync(form);
    return { spreadsheetId, title, rows };
  } catch (error) {
    throw new ValidationError(friendly(error));
  }
};

export const disconnectSpreadsheet = async (formId: string) => {
  const form = await getFormOrFail(formId);
  form.sheets.enabled = false;
  form.sheets.needsFullResync = false;
  form.sheets.lastError = null;
  await form.save();
  return form;
};

export const resyncForm = async (formId: string) => {
  const form = await getFormOrFail(formId);
  if (!form.sheets.enabled) throw new ValidationError('Conecta una hoja primero');
  try {
    return await fullResync(form);
  } catch (error) {
    throw new ValidationError(friendly(error));
  }
};

/**
 * Reacción a cada respuesta guardada: fila nueva → append; cualquier otro
 * caso (edición, estructura cambiada) → reescritura completa.
 */
export const handleResponseSaved = async (
  formSnapshot: IFormDocument,
  response: IFormResponseDocument,
  info: { updated: boolean }
): Promise<void> => {
  if (!formSnapshot.sheets?.enabled || !formSnapshot.sheets.spreadsheetId || !isSheetsConfigured()) return;
  // Releer: el snapshot puede no tener needsFullResync al día
  const form = await Form.findById(formSnapshot._id);
  if (!form || !form.sheets.enabled) return;

  try {
    if (info.updated || form.sheets.needsFullResync) {
      await fullResync(form);
      return;
    }
    const { spreadsheetId, sheetName } = sheetsFilter(form);
    const row = buildRow(form, buildColumns(form), {
      submittedAt: response.createdAt || new Date(),
      kind: response.respondent.kind,
      placa: response.respondent.placa,
      contact: response.respondent.contact || {},
      answers: (response.answers as Record<string, any>) || {},
    });
    await getGateway().appendRows(spreadsheetId, sheetName, [row]);
    await FormResponse.updateOne(
      { _id: response._id },
      { $set: { 'sheetsSync.status': 'synced', 'sheetsSync.attempts': 0, 'sheetsSync.lastError': null } }
    );
    await Form.updateOne({ _id: form._id }, { $set: { 'sheets.lastSyncAt': new Date(), 'sheets.lastError': null } });
  } catch (error) {
    logger.warn('No se pudo sincronizar la respuesta con Google Sheets', {
      context: 'SheetsSync',
      formId: String(form._id),
      error: (error as Error)?.message,
    });
    await FormResponse.updateOne(
      { _id: response._id },
      {
        $set: { 'sheetsSync.status': 'failed', 'sheetsSync.lastError': friendly(error) },
        $inc: { 'sheetsSync.attempts': 1 },
      }
    );
    await Form.updateOne({ _id: form._id }, { $set: { 'sheets.lastError': friendly(error), 'sheets.needsFullResync': true } });
  }
};

/**
 * Reintento (cron): reescribe los formularios con hoja conectada que quedaron
 * desactualizados o con respuestas sin sincronizar.
 */
export const syncPending = async () => {
  if (!isSheetsConfigured()) return { configured: false, forms: 0, synced: 0, failed: 0 };

  const pendingFormIds = await FormResponse.distinct('formId', {
    'sheetsSync.status': { $in: ['pending', 'failed'] },
    'sheetsSync.attempts': { $lt: MAX_SYNC_ATTEMPTS },
  });
  const forms = await Form.find({
    deletedAt: null,
    'sheets.enabled': true,
    'sheets.spreadsheetId': { $ne: null },
    $or: [{ 'sheets.needsFullResync': true }, { _id: { $in: pendingFormIds } }],
  });

  let synced = 0;
  let failed = 0;
  for (const form of forms) {
    try {
      await fullResync(form);
      synced += 1;
    } catch {
      failed += 1;
      await FormResponse.updateMany(
        { formId: form._id, 'sheetsSync.status': { $in: ['pending', 'failed'] } },
        { $set: { 'sheetsSync.status': 'failed' }, $inc: { 'sheetsSync.attempts': 1 } }
      );
    }
  }
  return { configured: true, forms: forms.length, synced, failed };
};

/** Engancha la sincronización a las respuestas guardadas (se llama al arrancar). */
export const registerSheetsSync = (): void => {
  onResponseSaved(handleResponseSaved);
};
