jest.mock('../../models/Form');
jest.mock('../../models/FormResponse');
jest.mock('../../models/Young');
jest.mock('../pointsService', () => ({
  pointsService: { createTransaction: jest.fn() },
}));
jest.mock('./formHooks', () => ({ notifyResponseSaved: jest.fn() }));

import Form from '../../models/Form';
import FormResponse from '../../models/FormResponse';
import Young from '../../models/Young';
import { pointsService } from '../pointsService';
import { getPublicForm, identifyByPlaca, submitResponse } from './formResponseService';
import { bowlingForm } from './domain/__fixtures__/bowlingForm';

const mockedForm = Form as jest.Mocked<typeof Form>;
const mockedResponse = FormResponse as jest.Mocked<typeof FormResponse>;
const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedPoints = pointsService as jest.Mocked<typeof pointsService>;

const makeForm = (overrides: Record<string, unknown> = {}) => ({
  _id: 'form1',
  slug: 'bolos-abc123',
  title: 'Salida a bolos',
  description: '',
  coverImage: null,
  event: { location: 'Bolera' },
  status: 'OPEN',
  closesAt: null,
  capacity: null,
  seatsTaken: 0,
  ...bowlingForm(),
  settings: { allowGuests: true, pointsReward: 0, showRegisterCta: true },
  sheets: { enabled: false, spreadsheetId: null },
  ...overrides,
});

const javier = {
  _id: 'young1',
  fullName: 'Javier Andrés Montaño',
  placa: '@MODJAVI001',
  phone: '3001234567',
  email: 'javier@gmail.com',
  ageRange: '22-25',
};

const attendingAnswers = { attend: 'yes', companions: 1, transport: 'own' };

const lastCreated = () => (mockedResponse.create as jest.Mock).mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
  mockedForm.findOne.mockResolvedValue(makeForm() as any);
  mockedForm.findOneAndUpdate.mockResolvedValue({ _id: 'form1' } as any);
  mockedForm.updateOne.mockResolvedValue({} as any);
  mockedResponse.findOne.mockResolvedValue(null);
  (mockedResponse.create as jest.Mock).mockImplementation(async (doc: any) => ({
    _id: 'resp1',
    ...doc,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  mockedYoung.findOne.mockResolvedValue(null);
});

describe('getPublicForm', () => {
  it('un borrador no existe para el público pero sí para quien administra', async () => {
    mockedForm.findOne.mockResolvedValue(makeForm({ status: 'DRAFT' }) as any);
    await expect(getPublicForm('bolos-abc123')).rejects.toThrow(/no encontrado/);

    const data = await getPublicForm('bolos-abc123', { userId: 'admin', scopes: ['forms:manage'] });
    expect(data.availability).toBe('draft');
  });

  it('no expone la configuración de Sheets ni los campos ocultos', async () => {
    const { form } = await getPublicForm('bolos-abc123');
    expect(form).not.toHaveProperty('sheets');
    expect(form.contactFields.map(c => c.field)).toEqual(['fullName', 'phone', 'email']);
  });

  it('con sesión devuelve sus datos y qué falta', async () => {
    mockedYoung.findOne.mockResolvedValue({ ...javier, phone: undefined } as any);
    const { me } = await getPublicForm('bolos-abc123', { userId: 'young1' });
    expect(me).toMatchObject({
      shortName: 'Javier M.',
      placa: '@MODJAVI001',
      missing: ['phone'],
      contact: { fullName: 'Javier Andrés Montaño', phone: null, email: 'javier@gmail.com' },
    });
  });
});

describe('identifyByPlaca', () => {
  it('solo devuelve datos enmascarados', async () => {
    mockedYoung.findOne.mockResolvedValue(javier as any);
    const data = await identifyByPlaca('bolos-abc123', ' @modjavi001 ');

    expect(mockedYoung.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ placa: '@MODJAVI001', deletedAt: null, isSpam: { $ne: true } })
    );
    expect(data).toEqual({
      placa: '@MODJAVI001',
      shortName: 'Javier M.',
      masked: { phone: '••• 4567', email: 'j•••@gmail.com' },
      saved: ['fullName', 'phone', 'email'],
      missing: [],
      alreadyResponded: false,
    });
    expect(JSON.stringify(data)).not.toContain('3001234567');
    expect(JSON.stringify(data)).not.toContain('javier@gmail.com');
  });

  it('rechaza formato inválido sin consultar la base', async () => {
    await expect(identifyByPlaca('bolos-abc123', 'hola')).rejects.toThrow(/Formato/);
    expect(mockedYoung.findOne).not.toHaveBeenCalled();
  });

  it('placa de joven eliminado/spam → no encontrada', async () => {
    mockedYoung.findOne.mockResolvedValue(null);
    await expect(identifyByPlaca('bolos-abc123', '@MODXXXX001')).rejects.toThrow(/No encontramos esa placa/);
  });
});

describe('submitResponse', () => {
  it('invitado: guarda sus datos y exige aceptar la política', async () => {
    const payload = {
      contact: { fullName: 'Ana Pérez', phone: '3110000000' },
      answers: attendingAnswers,
    };
    await expect(submitResponse('bolos-abc123', payload)).rejects.toThrow(/tratamiento de datos/);

    const result = await submitResponse('bolos-abc123', { ...payload, acceptPolicy: true });
    expect(result).toMatchObject({ kind: 'guest', updated: false, attending: true });
    expect(lastCreated()).toMatchObject({
      respondent: { kind: 'guest', youngId: null, contact: { fullName: 'Ana Pérez', phone: '3110000000' } },
      answers: { attend: 'yes', companions: 1, transport: 'own' },
    });
    expect(lastCreated().consentAcceptedAt).toBeInstanceOf(Date);
  });

  it('no admite invitados si el formulario es solo para jóvenes', async () => {
    mockedForm.findOne.mockResolvedValue(
      makeForm({ settings: { allowGuests: false, pointsReward: 0 } }) as any
    );
    await expect(
      submitResponse('bolos-abc123', { contact: {}, answers: attendingAnswers, acceptPolicy: true })
    ).rejects.toThrow(/solo para jóvenes/);
  });

  it('por placa: los datos salen del perfil, no de lo que escriban', async () => {
    mockedYoung.findOne.mockResolvedValue(javier as any);
    await submitResponse('bolos-abc123', {
      placa: '@MODJAVI001',
      contact: { fullName: 'Impostor', phone: '3000000000' },
      answers: attendingAnswers,
    });
    expect(lastCreated().respondent).toEqual({
      kind: 'placa',
      youngId: 'young1',
      placa: '@MODJAVI001',
      contact: { fullName: 'Javier Andrés Montaño', phone: '3001234567', email: 'javier@gmail.com' },
    });
  });

  it('con sesión y sin teléfono en el perfil: lo pide y solo entonces lo guarda en el perfil', async () => {
    mockedYoung.findOne.mockResolvedValue({ ...javier, phone: undefined } as any);
    mockedYoung.updateOne = jest.fn().mockResolvedValue({}) as any;

    await expect(
      submitResponse('bolos-abc123', { answers: attendingAnswers }, { userId: 'young1' })
    ).rejects.toMatchObject({ details: { contact: { phone: expect.stringMatching(/obligatorio/) } } });

    await submitResponse(
      'bolos-abc123',
      { contact: { phone: '3009998877' }, answers: attendingAnswers, saveToProfile: true },
      { userId: 'young1' }
    );
    expect(lastCreated().respondent.kind).toBe('session');
    expect(mockedYoung.updateOne).toHaveBeenCalledWith({ _id: 'young1' }, { $set: { phone: '3009998877' } });
  });

  it('por placa nunca modifica el perfil aunque pidan guardarlo', async () => {
    mockedYoung.findOne.mockResolvedValue({ ...javier, phone: undefined } as any);
    mockedYoung.updateOne = jest.fn() as any;
    await submitResponse('bolos-abc123', {
      placa: '@MODJAVI001',
      contact: { phone: '3009998877' },
      answers: attendingAnswers,
      saveToProfile: true,
    });
    expect(mockedYoung.updateOne).not.toHaveBeenCalled();
  });

  it('si ya respondió, actualiza la misma respuesta', async () => {
    mockedYoung.findOne.mockResolvedValue(javier as any);
    const existing: any = {
      _id: 'resp1',
      attending: true,
      respondent: { kind: 'session', contact: {} },
      answers: { attend: 'yes' },
      markModified: jest.fn(),
      save: jest.fn().mockImplementation(async function (this: any) { return existing; }),
    };
    mockedResponse.findOne.mockResolvedValue(existing);

    const result = await submitResponse('bolos-abc123', { answers: { attend: 'no' } }, { userId: 'young1' });

    expect(result.updated).toBe(true);
    expect(mockedResponse.create).not.toHaveBeenCalled();
    expect(existing.answers).toEqual({ attend: 'no' });
    // Dejó de asistir → libera su cupo
    expect(mockedForm.updateOne).toHaveBeenCalledWith(
      { _id: 'form1', seatsTaken: { $gt: 0 } },
      { $inc: { seatsTaken: -1 } }
    );
  });

  it('formulario cerrado o vencido → rechazo', async () => {
    mockedForm.findOne.mockResolvedValue(makeForm({ status: 'CLOSED' }) as any);
    await expect(submitResponse('bolos-abc123', {})).rejects.toThrow(/ya no recibe/);

    mockedForm.findOne.mockResolvedValue(makeForm({ closesAt: new Date(Date.now() - 1000) }) as any);
    await expect(submitResponse('bolos-abc123', {})).rejects.toThrow(/ya no recibe/);
  });

  it('cupo lleno: rechaza a quien va, pero acepta a quien dice que no va', async () => {
    mockedForm.findOne.mockResolvedValue(makeForm({ capacity: 10, seatsTaken: 10 }) as any);
    mockedForm.findOneAndUpdate.mockResolvedValue(null);
    const base = { contact: { fullName: 'Ana Pérez', phone: '3110000000' }, acceptPolicy: true };

    await expect(submitResponse('bolos-abc123', { ...base, answers: attendingAnswers })).rejects.toThrow(
      /no quedan cupos/
    );
    const result = await submitResponse('bolos-abc123', { ...base, answers: { attend: 'no' } });
    expect(result.attending).toBe(false);
  });

  it('respuestas inválidas devuelven el detalle por pregunta', async () => {
    await expect(
      submitResponse('bolos-abc123', {
        contact: { fullName: 'Ana Pérez', phone: '3110000000' },
        answers: { attend: 'yes' },
        acceptPolicy: true,
      })
    ).rejects.toMatchObject({
      details: { answers: { companions: expect.any(String), transport: expect.any(String) } },
    });
  });

  it('otorga los puntos del formulario una sola vez', async () => {
    mockedForm.findOne.mockResolvedValue(
      makeForm({ settings: { allowGuests: true, pointsReward: 20 } }) as any
    );
    mockedYoung.findOne.mockResolvedValue(javier as any);
    mockedPoints.createTransaction.mockResolvedValue({ _id: 'tx1' } as any);

    const first = await submitResponse('bolos-abc123', { answers: attendingAnswers }, { userId: 'young1' });
    expect(first.pointsAwarded).toBe(20);
    expect(mockedPoints.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ youngId: 'young1', points: 20, type: 'FORM_RESPONSE' })
    );

    // Segunda vez: la respuesta existente ya tiene la transacción
    const existing: any = {
      _id: 'resp1',
      attending: true,
      pointsTransactionId: 'tx1',
      respondent: { youngId: 'young1', contact: {} },
      answers: {},
      markModified: jest.fn(),
    };
    existing.save = jest.fn().mockResolvedValue(existing);
    mockedResponse.findOne.mockResolvedValue(existing);
    const second = await submitResponse('bolos-abc123', { answers: attendingAnswers }, { userId: 'young1' });
    expect(second.pointsAwarded).toBe(0);
    expect(mockedPoints.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('sin temporada activa la respuesta se guarda igual (sin puntos)', async () => {
    mockedForm.findOne.mockResolvedValue(
      makeForm({ settings: { allowGuests: true, pointsReward: 20 } }) as any
    );
    mockedYoung.findOne.mockResolvedValue(javier as any);
    mockedPoints.createTransaction.mockRejectedValue(new Error('No hay temporada activa'));

    const result = await submitResponse('bolos-abc123', { answers: attendingAnswers }, { userId: 'young1' });
    expect(result.pointsAwarded).toBe(0);
    expect(result.responseId).toBe('resp1');
  });
});
