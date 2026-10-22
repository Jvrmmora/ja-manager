jest.mock('../../models/Form');
jest.mock('../../models/FormResponse');
jest.mock('../pointsService', () => ({
  pointsService: { deleteTransaction: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../config/cloudinary', () => ({
  uploadLandingMediaToCloudinary: jest.fn().mockResolvedValue('https://img/cover.webp'),
}));

import Form from '../../models/Form';
import FormResponse from '../../models/FormResponse';
import { pointsService } from '../pointsService';
import {
  buildResponseTable,
  createForm,
  deleteResponse,
  duplicateForm,
  getFormStats,
  setFormStatus,
  updateForm,
} from './formService';
import { bowlingForm } from './domain/__fixtures__/bowlingForm';

const mockedForm = Form as jest.Mocked<typeof Form>;
const mockedResponse = FormResponse as jest.Mocked<typeof FormResponse>;

const FORM_ID = '64b7f0f0f0f0f0f0f0f0f0f0';
const RESP_ID = '64b7f0f0f0f0f0f0f0f0f0f1';

/** Documento de formulario mínimo con los métodos que usa el servicio. */
const makeFormDoc = (overrides: Record<string, unknown> = {}) => {
  const doc: any = {
    _id: FORM_ID,
    title: 'Salida a bolos',
    slug: 'salida-a-bolos-abc123',
    status: 'DRAFT',
    publishedAt: null,
    closesAt: null,
    capacity: null,
    seatsTaken: 0,
    ...bowlingForm(),
    settings: { allowGuests: true, pointsReward: 0, showRegisterCta: true },
    sheets: { enabled: false, needsFullResync: false },
    ...overrides,
  };
  doc.set = jest.fn((key: any, value?: any) => {
    if (typeof key === 'string') doc[key] = value;
    else Object.assign(doc, key);
  });
  doc.toObject = jest.fn(() => ({ ...doc }));
  doc.save = jest.fn().mockResolvedValue(doc);
  return doc;
};

const leanResult = (value: unknown) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

beforeEach(() => {
  jest.clearAllMocks();
  (mockedForm.create as jest.Mock).mockImplementation(async (doc: any) => doc);
});

describe('createForm', () => {
  it('usa la plantilla de evento con pregunta de asistencia y un slug único', async () => {
    const form: any = await createForm({ title: 'Fogata de octubre' }, FORM_ID);
    expect(form.slug).toMatch(/^fogata-de-octubre-[a-f0-9]{6}$/);
    const firstQuestion = form.sections[0].questions[0];
    expect(firstQuestion).toMatchObject({ type: 'yes_no', label: '¿Asistirás?' });
    expect(form.attendanceQuestionId).toBe(firstQuestion.id);
  });

  it('la plantilla en blanco no trae preguntas', async () => {
    const form: any = await createForm({ title: 'Encuesta', template: 'blank' }, 'no-es-id');
    expect(form.sections[0].questions).toEqual([]);
    expect(form.createdBy).toBeUndefined();
  });
});

describe('setFormStatus / updateForm', () => {
  it('no publica un formulario incoherente y explica por qué', async () => {
    const doc = makeFormDoc({ sections: [] });
    mockedForm.findOne.mockResolvedValue(doc);
    await expect(setFormStatus(FORM_ID, 'OPEN')).rejects.toMatchObject({
      details: { problems: expect.arrayContaining(['El formulario necesita al menos una pregunta']) },
    });
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('publicar marca publishedAt y limpia una fecha de cierre vencida', async () => {
    const doc = makeFormDoc({ closesAt: new Date(Date.now() - 60_000) });
    mockedForm.findOne.mockResolvedValue(doc);
    await setFormStatus(FORM_ID, 'OPEN');
    expect(doc.status).toBe('OPEN');
    expect(doc.publishedAt).toBeInstanceOf(Date);
    expect(doc.closesAt).toBeNull();
  });

  it('un borrador puede guardarse incompleto', async () => {
    const doc = makeFormDoc();
    mockedForm.findOne.mockResolvedValue(doc);
    await updateForm(FORM_ID, { sections: [{ id: 's', questions: [] }] as any });
    expect(doc.save).toHaveBeenCalled();
  });

  it('publicado: rechaza cambios que rompen la estructura', async () => {
    const doc = makeFormDoc({ status: 'OPEN' });
    mockedForm.findOne.mockResolvedValue(doc);
    await expect(updateForm(FORM_ID, { sections: [{ id: 's', questions: [] }] as any })).rejects.toThrow(
      /impiden publicarlo/
    );
  });

  it('con Sheets conectado, cambiar preguntas pide resincronizar', async () => {
    const doc = makeFormDoc({ sheets: { enabled: true, needsFullResync: false } });
    mockedForm.findOne.mockResolvedValue(doc);
    await updateForm(FORM_ID, { sections: bowlingForm().sections });
    expect(doc.sheets.needsFullResync).toBe(true);
  });

  it('actualiza event/settings parcialmente sin borrar el resto', async () => {
    const doc = makeFormDoc({ event: { location: 'Bolera', cost: 20000 } });
    mockedForm.findOne.mockResolvedValue(doc);
    await updateForm(FORM_ID, { event: { cost: 25000 }, settings: { pointsReward: 10 } });
    expect(doc.event).toEqual({ location: 'Bolera', cost: 25000 });
    expect(doc.settings).toMatchObject({ allowGuests: true, pointsReward: 10 });
  });
});

describe('duplicateForm', () => {
  it('copia la estructura como borrador nuevo sin respuestas ni Sheets', async () => {
    mockedForm.findOne.mockResolvedValue(makeFormDoc({ status: 'OPEN', seatsTaken: 7 }));
    const copy: any = await duplicateForm(FORM_ID, FORM_ID);
    expect(copy.title).toBe('Salida a bolos (copia)');
    expect(copy.slug).not.toBe('salida-a-bolos-abc123');
    expect(copy).not.toHaveProperty('status');
    expect(copy).not.toHaveProperty('seatsTaken');
    expect(copy).not.toHaveProperty('sheets');
    expect(copy.sections).toHaveLength(2);
  });
});

describe('getFormStats', () => {
  it('cuenta asistencia, tipos y opciones', async () => {
    mockedForm.findOne.mockResolvedValue(makeFormDoc());
    (mockedResponse.find as jest.Mock).mockReturnValue(
      leanResult([
        { attending: true, respondent: { kind: 'session' }, answers: { attend: 'yes', transport: 'bus', snacks: ['pizza', 'veg'] } },
        { attending: true, respondent: { kind: 'guest' }, answers: { attend: 'yes', transport: 'own', snacks: ['pizza'] } },
        { attending: false, respondent: { kind: 'placa' }, answers: { attend: 'no' } },
      ])
    );

    const stats = await getFormStats(FORM_ID);
    expect(stats.total).toBe(3);
    expect(stats.attendance).toEqual({ yes: 2, no: 1, unknown: 0 });
    expect(stats.byKind).toEqual({ session: 1, placa: 1, guest: 1 });
    const snacks = stats.questions.find(q => q.questionId === 'snacks')!;
    expect(snacks.answered).toBe(2);
    expect(snacks.options).toEqual([
      { id: 'pizza', label: 'Pizza', count: 2 },
      { id: 'hotdog', label: 'Perro caliente', count: 0 },
      { id: 'veg', label: 'Vegetariano', count: 1 },
    ]);
  });
});

describe('deleteResponse', () => {
  it('libera el cupo, revierte los puntos y pide resincronizar Sheets', async () => {
    mockedForm.findOne.mockResolvedValue(makeFormDoc({ sheets: { enabled: true } }));
    mockedResponse.findOneAndDelete.mockResolvedValue({ attending: true, pointsTransactionId: 'tx1' } as any);
    mockedForm.updateOne.mockResolvedValue({} as any);

    await deleteResponse(FORM_ID, RESP_ID);

    expect(mockedForm.updateOne).toHaveBeenCalledWith(
      { _id: FORM_ID, seatsTaken: { $gt: 0 } },
      { $inc: { seatsTaken: -1 } }
    );
    expect(pointsService.deleteTransaction).toHaveBeenCalledWith('tx1');
    expect(mockedForm.updateOne).toHaveBeenCalledWith(
      { _id: FORM_ID },
      { $set: { 'sheets.needsFullResync': true } }
    );
  });

  it('id inválido → no encontrado', async () => {
    mockedForm.findOne.mockResolvedValue(makeFormDoc());
    await expect(deleteResponse(FORM_ID, 'x')).rejects.toThrow(/no encontrad/);
  });
});

describe('buildResponseTable', () => {
  it('encabezado + una fila por respuesta en orden', async () => {
    (mockedResponse.find as jest.Mock).mockReturnValue(
      leanResult([
        {
          createdAt: new Date('2026-10-20T15:00:00Z'),
          respondent: { kind: 'guest', placa: null, contact: { fullName: 'Ana', phone: '311' } },
          answers: { attend: 'no' },
        },
      ])
    );
    const table = await buildResponseTable(makeFormDoc());
    expect(table).toHaveLength(2);
    expect(table[0][3]).toBe('Nombre completo');
    expect(table[1].slice(1, 7)).toEqual(['Invitado', '', 'Ana', '311', '', 'No']);
  });
});
