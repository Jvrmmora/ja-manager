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

import RegistrationRequest from '../models/RegistrationRequest';
import Young from '../models/Young';
import Role from '../models/Role';
import {
  checkEmailUnique,
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

  it('retorna el fullName cuando la placa existe', async () => {
    mockedYoung.findOne.mockResolvedValue({ fullName: 'Ana' } as any);

    const result = await checkPlacaExists('@MODANA001');

    expect(result).toEqual({
      exists: true,
      message: 'Placa encontrada',
      data: { fullName: 'Ana' },
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
