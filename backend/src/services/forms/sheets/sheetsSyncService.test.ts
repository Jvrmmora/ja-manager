jest.mock('../../../models/Form');
jest.mock('../../../models/FormResponse');
jest.mock('../formService', () => ({
  buildResponseTable: jest.fn(),
  getFormOrFail: jest.fn(),
}));

import Form from '../../../models/Form';
import FormResponse from '../../../models/FormResponse';
import { buildResponseTable, getFormOrFail } from '../formService';
import { FakeSheetsGateway } from './fakeSheetsGateway';
import { SheetsError } from './types';
import {
  connectSpreadsheet,
  fullResync,
  handleResponseSaved,
  parseSpreadsheetId,
  setSheetsGateway,
  syncPending,
} from './sheetsSyncService';
import { bowlingForm } from '../domain/__fixtures__/bowlingForm';

const mockedForm = Form as jest.Mocked<typeof Form>;
const mockedResponse = FormResponse as jest.Mocked<typeof FormResponse>;
const mockedTable = buildResponseTable as jest.Mock;
const mockedGetForm = getFormOrFail as jest.Mock;

const SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';

const makeForm = (sheets: Record<string, unknown> = {}) => {
  const doc: any = {
    _id: 'form1',
    title: 'Bolos',
    ...bowlingForm(),
    sheets: { enabled: true, spreadsheetId: SHEET_ID, sheetName: 'Respuestas', needsFullResync: false, ...sheets },
  };
  doc.save = jest.fn().mockResolvedValue(doc);
  return doc;
};

const response = (overrides: Record<string, unknown> = {}): any => ({
  _id: 'resp1',
  createdAt: new Date('2026-10-20T15:00:00Z'),
  respondent: { kind: 'guest', placa: null, contact: { fullName: 'Ana', phone: '311' } },
  answers: { attend: 'no' },
  ...overrides,
});

let fake: FakeSheetsGateway;

beforeEach(() => {
  jest.clearAllMocks();
  fake = new FakeSheetsGateway();
  setSheetsGateway(fake);
  mockedForm.updateOne.mockResolvedValue({} as any);
  mockedResponse.updateOne.mockResolvedValue({} as any);
  mockedResponse.updateMany.mockResolvedValue({} as any);
  mockedTable.mockResolvedValue([['Fecha', 'Nombre'], ['20/10', 'Ana']]);
});

afterAll(() => setSheetsGateway(null));

describe('parseSpreadsheetId', () => {
  it('acepta el enlace completo o el id', () => {
    expect(parseSpreadsheetId(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`)).toBe(SHEET_ID);
    expect(parseSpreadsheetId(SHEET_ID)).toBe(SHEET_ID);
    expect(parseSpreadsheetId('https://google.com')).toBeNull();
  });
});

describe('fullResync', () => {
  it('reescribe la hoja desde Mongo y marca todo como sincronizado', async () => {
    const form = makeForm({ needsFullResync: true });
    await fullResync(form);
    expect(fake.rows(SHEET_ID)).toEqual([['Fecha', 'Nombre'], ['20/10', 'Ana']]);
    expect(mockedForm.updateOne).toHaveBeenCalledWith(
      { _id: 'form1' },
      { $set: expect.objectContaining({ 'sheets.needsFullResync': false, 'sheets.lastError': null }) }
    );
    expect(mockedResponse.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ formId: 'form1' }),
      { $set: expect.objectContaining({ 'sheetsSync.status': 'synced' }) }
    );
  });

  it('si falla guarda el error legible y deja pendiente la reescritura', async () => {
    fake.failNext = new SheetsError('No tenemos permiso sobre esa hoja', 403);
    await expect(fullResync(makeForm())).rejects.toThrow(/permiso/);
    expect(mockedForm.updateOne).toHaveBeenCalledWith(
      { _id: 'form1' },
      { $set: { 'sheets.lastError': 'No tenemos permiso sobre esa hoja', 'sheets.needsFullResync': true } }
    );
  });
});

describe('connectSpreadsheet', () => {
  it('rechaza enlaces que no son de Sheets', async () => {
    mockedGetForm.mockResolvedValue(makeForm({ enabled: false, spreadsheetId: null }));
    await expect(connectSpreadsheet('form1', 'https://google.com')).rejects.toThrow(/Google Sheets/);
  });

  it('sin permiso explica con quién compartir la hoja', async () => {
    mockedGetForm.mockResolvedValue(makeForm({ enabled: false, spreadsheetId: null }));
    fake.failNext = new SheetsError('Compártela con bot@x.iam.gserviceaccount.com como Editor.', 403);
    await expect(connectSpreadsheet('form1', SHEET_ID)).rejects.toThrow(/Compártela/);
  });

  it('conecta, guarda el id y vuelca las respuestas existentes', async () => {
    const form = makeForm({ enabled: false, spreadsheetId: null });
    mockedGetForm.mockResolvedValue(form);
    const result = await connectSpreadsheet('form1', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
    expect(result).toEqual({ spreadsheetId: SHEET_ID, title: `Hoja ${SHEET_ID}`, rows: 1 });
    expect(form.sheets).toMatchObject({ enabled: true, spreadsheetId: SHEET_ID });
    expect(fake.rows(SHEET_ID)).toHaveLength(2);
  });
});

describe('handleResponseSaved', () => {
  it('respuesta nueva → agrega una fila con el mismo formato del Excel', async () => {
    const form = makeForm();
    mockedForm.findById.mockResolvedValue(form);
    await handleResponseSaved(form, response(), { updated: false });

    const rows = fake.rows(SHEET_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0].slice(1, 7)).toEqual(['Invitado', '', 'Ana', '311', '', 'No']);
    expect(mockedResponse.updateOne).toHaveBeenCalledWith(
      { _id: 'resp1' },
      { $set: expect.objectContaining({ 'sheetsSync.status': 'synced' }) }
    );
  });

  it('respuesta editada o estructura cambiada → reescritura completa', async () => {
    mockedForm.findById.mockResolvedValue(makeForm());
    await handleResponseSaved(makeForm(), response(), { updated: true });
    expect(fake.calls).toEqual(['ensureSheet', 'replaceAll']);

    fake.calls = [];
    mockedForm.findById.mockResolvedValue(makeForm({ needsFullResync: true }));
    await handleResponseSaved(makeForm(), response(), { updated: false });
    expect(fake.calls).toEqual(['ensureSheet', 'replaceAll']);
  });

  it('si Google falla, la respuesta queda en "failed" para el reintento', async () => {
    mockedForm.findById.mockResolvedValue(makeForm());
    fake.failNext = new SheetsError('Cuota excedida', 429);
    await handleResponseSaved(makeForm(), response(), { updated: false });
    expect(mockedResponse.updateOne).toHaveBeenCalledWith(
      { _id: 'resp1' },
      {
        $set: { 'sheetsSync.status': 'failed', 'sheetsSync.lastError': 'Cuota excedida' },
        $inc: { 'sheetsSync.attempts': 1 },
      }
    );
  });

  it('sin hoja conectada no hace nada', async () => {
    await handleResponseSaved(makeForm({ enabled: false }), response(), { updated: false });
    expect(mockedForm.findById).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
  });
});

describe('syncPending', () => {
  it('reescribe los formularios pendientes y cuenta los que fallan', async () => {
    (mockedResponse.distinct as jest.Mock).mockResolvedValue(['form1']);
    const ok = makeForm();
    const broken = makeForm();
    broken._id = 'form2';
    mockedForm.find.mockResolvedValue([ok, broken] as any);
    mockedTable.mockResolvedValueOnce([['h'], ['r']]).mockRejectedValueOnce(new Error('boom'));

    const result = await syncPending();
    expect(result).toEqual({ configured: true, forms: 2, synced: 1, failed: 1 });
    expect(mockedResponse.updateMany).toHaveBeenCalledWith(
      { formId: 'form2', 'sheetsSync.status': { $in: ['pending', 'failed'] } },
      { $set: { 'sheetsSync.status': 'failed' }, $inc: { 'sheetsSync.attempts': 1 } }
    );
  });
});
