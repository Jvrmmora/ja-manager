jest.mock('../models/RegistrationRequest');
jest.mock('../models/Young');
jest.mock('../models/Role');
jest.mock('./emailService', () => ({
  emailService: { sendEmail: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('./consentService', () => ({
  recordConsent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../config/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('https://img/x.jpg'),
}));
jest.mock('./pointsService', () => ({
  pointsService: { assignReferralPoints: jest.fn().mockResolvedValue({}) },
}));

import RegistrationRequest from '../models/RegistrationRequest';
import Young from '../models/Young';
import Role from '../models/Role';
import mongoose from 'mongoose';
import { pointsService } from './pointsService';
import { CURRENT_POLICY_VERSION } from '../config/privacyPolicy';
import {
  checkEmailUnique,
  createRegistrationRequest,
  checkPlacaExists,
  generatePlacaForRegistration,
  getRegistrationRequestById,
  reviewRegistrationRequest,
} from './registrationService';

const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedRequest = RegistrationRequest as jest.Mocked<typeof RegistrationRequest>;
const mockedRole = Role as jest.Mocked<typeof Role>;

const SUPER_ADMIN = { userId: 'admin1', username: 'admin', role_name: 'Super Admin' };

describe('registrationService.checkEmailUnique', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reporta existente si ya hay un Young con ese email', async () => {
    mockedYoung.findOne.mockResolvedValue({ _id: 'y1' } as any);

    const result = await checkEmailUnique('ana@test.com');

    expect(result).toEqual({
      exists: true,
      message: 'Este email ya está registrado',
    });
  });

  it('reporta existente si hay una solicitud pendiente', async () => {
    mockedYoung.findOne.mockResolvedValue(null);
    mockedRequest.findOne.mockResolvedValue({ _id: 'r1' } as any);

    const result = await checkEmailUnique('ana@test.com');

    expect(result.exists).toBe(true);
    expect(result.message).toMatch(/pendiente/);
  });

  it('reporta disponible si no existe en ninguna colección', async () => {
    mockedYoung.findOne.mockResolvedValue(null);
    mockedRequest.findOne.mockResolvedValue(null);

    const result = await checkEmailUnique('ana@test.com');

    expect(result).toEqual({ exists: false, message: 'Email disponible' });
  });
});

describe('registrationService.checkPlacaExists', () => {
  beforeEach(() => jest.clearAllMocks());

  it('solo revela el primer nombre (endpoint público)', async () => {
    mockedYoung.findOne.mockResolvedValue({ fullName: '  Ana María López Ruiz ' } as any);

    const result = await checkPlacaExists('@MODANA001');

    expect(result).toEqual({
      exists: true,
      message: 'Placa encontrada',
      data: { firstName: 'Ana' },
    });
    expect(JSON.stringify(result)).not.toContain('López');
  });

  it('ignora jóvenes eliminados o marcados como spam', async () => {
    mockedYoung.findOne.mockResolvedValue(null);

    await checkPlacaExists('@MODANA001');

    expect(mockedYoung.findOne).toHaveBeenCalledWith({
      placa: '@MODANA001',
      deletedAt: null,
      isSpam: { $ne: true },
    });
  });

  it('retorna no encontrada si no existe', async () => {
    mockedYoung.findOne.mockResolvedValue(null);

    const result = await checkPlacaExists('@MODANA001');

    expect(result).toEqual({ exists: false, message: 'Placa no encontrada' });
  });
});

describe('generatePlacaForRegistration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calcula el consecutivo combinando placas de Young y RegistrationRequest', async () => {
    mockedYoung.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ placa: '@MODANA002' }]),
      }),
    } as any);
    mockedRequest.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ placa: '@MODJAV007' }]),
      }),
    } as any);

    const placa = await generatePlacaForRegistration('Ana Maria');

    expect(placa).toBe('@MODANAM008');
  });
});

describe('registrationService.getRegistrationRequestById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza a quien no es Super Admin', async () => {
    await expect(
      getRegistrationRequestById('id1', {
        userId: 'u1',
        username: 'u1',
        role_name: 'Young role',
      })
    ).rejects.toThrow('Solo los administradores');
  });

  it('lanza NotFoundError si la solicitud no existe', async () => {
    mockedRequest.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    } as any);

    await expect(
      getRegistrationRequestById('507f1f77bcf86cd799439011', SUPER_ADMIN)
    ).rejects.toThrow('Solicitud de registro no encontrada');
  });
});

describe('registrationService.reviewRegistrationRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza revisar una solicitud que ya fue procesada', async () => {
    mockedRequest.findById.mockResolvedValue({ status: 'approved' } as any);

    await expect(
      reviewRegistrationRequest(
        '507f1f77bcf86cd799439011',
        { status: 'approved' },
        SUPER_ADMIN
      )
    ).rejects.toThrow('ya ha sido aprobada');
  });

  it('rechaza la solicitud y guarda la razón', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockedRequest.findById.mockResolvedValue({
      _id: 'req1',
      status: 'pending',
      email: 'ana@test.com',
      fullName: 'Ana',
      save,
    } as any);

    const result = await reviewRegistrationRequest(
      '507f1f77bcf86cd799439011',
      { status: 'rejected', rejectionReason: 'No cumple requisitos' },
      SUPER_ADMIN
    );

    expect(save).toHaveBeenCalled();
    expect(result.approved).toBe(false);
    if (!result.approved) {
      expect(result.request.status).toBe('rejected');
      expect(result.request.rejectionReason).toBe('No cumple requisitos');
    }
  });

  it('aprueba la solicitud, crea el Young y preserva el password ya encriptado', async () => {
    const requestSave = jest.fn().mockResolvedValue(undefined);
    const pendingRequest: any = {
      status: 'pending',
      fullName: 'Ana',
      ageRange: '19-21',
      phone: '3001234567',
      birthday: new Date('2000-01-01'),
      gender: 'femenino',
      role: 'joven adventista',
      email: 'ana@test.com',
      skills: [],
      profileImage: null,
      group: 1,
      placa: '@MODANA001',
      referredBy: null,
      password: 'hashed-pw',
      _id: 'req1',
      save: requestSave,
    };
    mockedRequest.findById.mockResolvedValue(pendingRequest);
    mockedRole.findOne.mockResolvedValue({ _id: 'role1', name: 'Young role' } as any);

    const youngSave = jest.fn().mockResolvedValue({ _id: 'young1' });
    (mockedYoung as any).mockImplementation(() => ({ save: youngSave }));
    mockedYoung.findByIdAndUpdate.mockResolvedValue({} as any);
    mockedYoung.findById.mockResolvedValue({
      _id: 'young1',
      fullName: 'Ana',
      placa: '@MODANA001',
      email: 'ana@test.com',
    } as any);

    const result = await reviewRegistrationRequest(
      '507f1f77bcf86cd799439011',
      { status: 'approved' },
      SUPER_ADMIN
    );

    expect(youngSave).toHaveBeenCalled();
    expect(mockedYoung.findByIdAndUpdate).toHaveBeenCalledWith(
      'young1',
      { $set: { password: 'hashed-pw' } },
      { runValidators: false }
    );
    expect(requestSave).toHaveBeenCalled();
    expect(result.approved).toBe(true);
    if (result.approved) {
      expect(result.young.placa).toBe('@MODANA001');
    }
  });
});

describe('registrationService.createRegistrationRequest (referidos)', () => {
  beforeEach(() => jest.clearAllMocks());

  const referrerId = new mongoose.Types.ObjectId();
  const newYoungId = new mongoose.Types.ObjectId();

  const setupMocks = () => {
    mockedYoung.findOne
      .mockResolvedValueOnce(null) // email libre
      .mockResolvedValueOnce({ _id: referrerId } as any) // placa de quien invita
      .mockResolvedValue(null); // Super Admin para la notificación
    mockedRequest.findOne.mockResolvedValue(null);
    mockedYoung.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as any);
    mockedRequest.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as any);
    mockedRole.findOne.mockResolvedValue({ _id: 'role1', name: 'Young role' } as any);
    (mockedYoung as any).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({
        _id: newYoungId,
        fullName: 'Daniela Rivera',
        email: 'daniela@test.com',
        placa: '@MODDANI001',
      }),
    }));
    (mockedRequest as any).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(undefined),
    }));
  };

  const baseValue = {
    fullName: 'Daniela Rivera',
    ageRange: '19-21',
    phone: '3001234567',
    birthday: '2000-01-01',
    gender: 'femenino',
    role: 'joven adventista',
    email: 'daniela@test.com',
    group: 1,
    password: 'Secreta123!',
    policyVersion: CURRENT_POLICY_VERSION,
  };

  it('asigna puntos de referido al registrarse con la placa de quien invita', async () => {
    setupMocks();

    await createRegistrationRequest(
      { ...baseValue, referredByPlaca: '@modzair052' },
      undefined,
      {} as any
    );

    expect(pointsService.assignReferralPoints).toHaveBeenCalledWith(
      referrerId.toString(),
      newYoungId.toString()
    );
  });

  it('no asigna puntos de referido si no hay placa de invitación', async () => {
    setupMocks();
    mockedYoung.findOne.mockReset().mockResolvedValue(null);

    await createRegistrationRequest(baseValue, undefined, {} as any);

    expect(pointsService.assignReferralPoints).not.toHaveBeenCalled();
  });

  it('no tumba el registro si falla la asignación de puntos', async () => {
    setupMocks();
    (pointsService.assignReferralPoints as jest.Mock).mockRejectedValueOnce(
      new Error('sin temporada')
    );

    const result = await createRegistrationRequest(
      { ...baseValue, referredByPlaca: '@MODZAIR052' },
      undefined,
      {} as any
    );

    expect(result.placa).toMatch(/^@MOD/);
  });
});

describe('registrationService.createRegistrationRequest (email existente)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no revela el nombre del dueño del email en el error', async () => {
    mockedYoung.findOne.mockResolvedValueOnce({ fullName: 'Ana María López' } as any);

    const error = await createRegistrationRequest(
      {
        fullName: 'Otra Persona',
        birthday: '2000-01-01',
        email: 'ana@test.com',
        policyVersion: CURRENT_POLICY_VERSION,
      },
      undefined,
      {} as any
    ).catch(e => e);

    expect(error.statusCode).toBe(409);
    expect(JSON.stringify(error.details)).not.toContain('Ana');
  });
});
