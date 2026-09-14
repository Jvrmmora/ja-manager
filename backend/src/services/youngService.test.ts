jest.mock('../models/Young');
jest.mock('../models/Role');
jest.mock('../repositories/youngRepository');

import Young from '../models/Young';
import Role from '../models/Role';
import { YoungRepository } from '../repositories/youngRepository';
import {
  buildYoungListFilters,
  computePlacaInitials,
  getYoungById,
  generatePlaca,
  resetPassword,
  markUserAsSpam,
  getRecentUsersCount,
} from './youngService';

const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedRole = Role as jest.Mocked<typeof Role>;
const mockedRepo = YoungRepository as jest.Mocked<typeof YoungRepository>;

describe('buildYoungListFilters', () => {
  it('no agrega filtros cuando no se especifica nada', () => {
    expect(buildYoungListFilters({})).toEqual({});
  });

  it('busca por frase completa y por palabras individuales cuando hay espacios', () => {
    const filters = buildYoungListFilters({ search: 'Ana Maria' });
    expect(filters.$or).toEqual(
      expect.arrayContaining([
        { fullName: { $regex: 'Ana Maria', $options: 'i' } },
        {
          $and: [
            { fullName: { $regex: 'Ana', $options: 'i' } },
            { fullName: { $regex: 'Maria', $options: 'i' } },
          ],
        },
      ])
    );
  });

  it('prioriza coincidencia exacta de placa cuando la búsqueda empieza con @', () => {
    const filters = buildYoungListFilters({ search: '@MODANA001' });
    expect(filters.$or[0]).toEqual({ placa: '@MODANA001' });
  });

  it('convierte groups de string[] a number[] para $in', () => {
    const filters = buildYoungListFilters({ groups: ['1', '3'] as any });
    expect(filters.group).toEqual({ $in: [1, 3] });
  });

  it('ignora ageRange/gender/role vacíos', () => {
    const filters = buildYoungListFilters({
      ageRange: '',
      gender: '',
      role: '',
    } as any);
    expect(filters).toEqual({});
  });
});

describe('computePlacaInitials', () => {
  it('usa las primeras 4 letras cuando el primer nombre las tiene', () => {
    expect(computePlacaInitials('Javier Perez')).toBe('JAVI');
  });

  it('completa con el segundo nombre cuando el primero tiene 2-3 letras', () => {
    expect(computePlacaInitials('Ana Maria')).toBe('ANAM');
  });

  it('lanza ValidationError si el nombre tiene menos de 2 letras', () => {
    expect(() => computePlacaInitials('A')).toThrow(
      'El nombre debe tener al menos 2 letras'
    );
  });
});

describe('youngService.getYoungById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prohíbe a un Young role ver el perfil de otro joven', async () => {
    await expect(
      getYoungById('other-id', {
        userId: 'me',
        username: 'me',
        role_name: 'Young role',
      })
    ).rejects.toThrow('No tienes permisos para ver esta información');
  });

  it('permite a un Young role ver su propio perfil', async () => {
    mockedRepo.findByIdActive.mockResolvedValue({ fullName: 'Ana' } as any);

    const result = await getYoungById('me', {
      userId: 'me',
      username: 'me',
      role_name: 'Young role',
    });

    expect(result.fullName).toBe('Ana');
  });

  it('lanza NotFoundError si el joven no existe', async () => {
    mockedRepo.findByIdActive.mockResolvedValue(null);

    await expect(
      getYoungById('missing', {
        userId: 'admin',
        username: 'admin',
        role_name: 'Super Admin',
      })
    ).rejects.toThrow('Joven no encontrado');
  });
});

describe('youngService.resetPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  const adminUser = { userId: 'admin1', username: 'admin', role_name: 'Super Admin' };

  it('rechaza contraseñas que no cumplen el patrón', async () => {
    await expect(
      resetPassword('id1', { new_password: 'weak' }, adminUser)
    ).rejects.toThrow('La nueva contraseña debe tener entre 8-50 caracteres');
  });

  it('lanza NotFoundError si el joven no existe', async () => {
    mockedRepo.findByIdActive.mockResolvedValue(null);

    await expect(
      resetPassword('id1', { new_password: 'Password123' }, adminUser)
    ).rejects.toThrow('Joven no encontrado');
  });

  it('exige placa asignada antes de resetear', async () => {
    mockedRepo.findByIdActive.mockResolvedValue({ placa: null } as any);

    await expect(
      resetPassword('id1', { new_password: 'Password123' }, adminUser)
    ).rejects.toThrow('debe tener una placa asignada');
  });

  it('un Young role no puede resetear la contraseña de otro joven', async () => {
    mockedRepo.findByIdActive.mockResolvedValue({ placa: '@MODANA001' } as any);

    await expect(
      resetPassword(
        'other-id',
        { new_password: 'Password123', current_password: 'x' },
        { userId: 'me', username: 'me', role_name: 'Young role' }
      )
    ).rejects.toThrow('No tienes permisos para cambiar esta contraseña');
  });

  it('un Young role debe dar su contraseña actual correcta', async () => {
    const comparePassword = jest.fn().mockResolvedValue(false);
    mockedRepo.findByIdActive.mockResolvedValue({
      placa: '@MODANA001',
      comparePassword,
    } as any);

    await expect(
      resetPassword(
        'me',
        { new_password: 'Password123', current_password: 'wrong' },
        { userId: 'me', username: 'me', role_name: 'Young role' }
      )
    ).rejects.toThrow('La contraseña actual es incorrecta');
  });

  it('Super Admin puede resetear sin validar contraseña actual', async () => {
    mockedRepo.findByIdActive.mockResolvedValue({
      placa: '@MODANA001',
    } as any);
    mockedYoung.findByIdAndUpdate.mockResolvedValue({
      id: 'id1',
      fullName: 'Ana',
    } as any);

    const result = await resetPassword(
      'id1',
      { new_password: 'Password123' },
      adminUser
    );

    expect(result.first_login).toBe(false);
    expect(mockedYoung.findByIdAndUpdate).toHaveBeenCalled();
  });
});

describe('youngService.markUserAsSpam', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza a usuarios que no son admin', async () => {
    await expect(
      markUserAsSpam('id1', true, {
        userId: 'u1',
        username: 'u1',
        role_name: 'Young role',
      })
    ).rejects.toThrow('No tienes permisos para marcar usuarios como spam');
  });

  it('marca como spam y aplica soft delete', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const young: any = {
      _id: 'id1',
      fullName: 'Ana',
      isSpam: false,
      deletedAt: null,
      save,
    };
    mockedRepo.findByIdActive.mockResolvedValue(young);

    const result = await markUserAsSpam('id1', true, {
      userId: 'admin',
      username: 'admin',
      role_name: 'Super Admin',
    });

    expect(save).toHaveBeenCalled();
    expect(result.isSpam).toBe(true);
    expect(result.deletedAt).toBeInstanceOf(Date);
  });
});

describe('youngService.getRecentUsersCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza a usuarios que no son admin', async () => {
    await expect(
      getRecentUsersCount(
        { userId: 'u1', username: 'u1', role_name: 'Young role' },
        48
      )
    ).rejects.toThrow('No tienes permisos para ver este contador');
  });

  it('excluye spam y jóvenes eliminados del conteo', async () => {
    mockedRepo.countActive.mockResolvedValue(7);

    const result = await getRecentUsersCount(
      { userId: 'admin', username: 'admin', role_name: 'Super Admin' },
      48
    );

    expect(result).toEqual({ count: 7, hours: 48 });
    expect(mockedRepo.countActive).toHaveBeenCalledWith(
      expect.objectContaining({ isSpam: { $ne: true } })
    );
  });
});

describe('youngService.generatePlaca', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundError si el joven no existe', async () => {
    mockedRepo.findByIdActive.mockResolvedValue(null);

    await expect(generatePlaca('id1')).rejects.toThrow('Joven no encontrado');
  });

  it('lanza ConflictError si el joven ya tiene placa', async () => {
    mockedRepo.findByIdActive.mockResolvedValue({
      fullName: 'Ana Maria',
      placa: '@MODANA001',
    } as any);

    await expect(generatePlaca('id1')).rejects.toThrow('ya tiene una placa asignada');
  });

  it('calcula el siguiente consecutivo a partir de las placas existentes', async () => {
    mockedRepo.findByIdActive.mockResolvedValue({
      fullName: 'Ana Maria',
      placa: null,
    } as any);
    mockedYoung.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([{ placa: '@MODANA001' }, { placa: '@MODJAV005' }]),
      }),
    } as any);
    mockedRole.findById.mockResolvedValue({
      _id: 'role1',
      name: 'Young role',
    } as any);
    mockedYoung.findByIdAndUpdate.mockResolvedValue({
      id: 'id1',
      fullName: 'Ana Maria',
    } as any);

    const result = await generatePlaca('id1');

    expect(result.placa).toBe('@MODANAM006');
    expect(result.tempPassword).toBe('Password006');
  });
});
