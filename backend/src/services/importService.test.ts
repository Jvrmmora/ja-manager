jest.mock('../models/Young');

import Young from '../models/Young';
import {
  processExcelDate,
  calculateAgeRange,
  getAgeRangeFromAge,
  normalizeColumnName,
  normalizeExcelRow,
  buildYoungDataFromRow,
  importYoungsFromRows,
} from './importService';

const mockedYoung = Young as jest.Mocked<typeof Young>;

describe('normalizeColumnName', () => {
  it('quita acentos, espacios y caracteres especiales', () => {
    expect(normalizeColumnName('Fecha Cumpleaños')).toBe('fecha_cumpleanos');
    expect(normalizeColumnName('Teléfono')).toBe('telefono');
    expect(normalizeColumnName('Núm. Grupo!')).toBe('num_grupo');
  });
});

describe('normalizeExcelRow', () => {
  it('mapea columnas en español a los campos de Young', () => {
    const row = { Nombre: 'Ana', Celular: '3001234567', Correo: 'a@a.com' };
    expect(normalizeExcelRow(row)).toEqual({
      fullName: 'Ana',
      phone: '3001234567',
      email: 'a@a.com',
    });
  });
});

describe('getAgeRangeFromAge', () => {
  it.each([
    [14, '13-15'],
    [17, '16-18'],
    [20, '19-21'],
    [24, '22-25'],
    [28, '26-30'],
    [40, '30+'],
  ])('mapea la edad %i al rango %s', (age, expected) => {
    expect(getAgeRangeFromAge(age)).toBe(expected);
  });
});

describe('calculateAgeRange', () => {
  it('calcula el rango a partir de una fecha de nacimiento válida', () => {
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    expect(calculateAgeRange(twentyYearsAgo)).toBe('19-21');
  });

  it('usa el rango por defecto si la fecha es inválida', () => {
    expect(calculateAgeRange(new Date('invalid'))).toBe('22-25');
  });
});

describe('processExcelDate', () => {
  it('usa 1 de enero del año actual si no hay valor', () => {
    const result = processExcelDate(undefined);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it('parsea un string dd/MM asignando el año actual', () => {
    const result = processExcelDate('26/01');
    expect(result.getDate()).toBe(26);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(new Date().getFullYear());
  });

  it('parsea un string dd-MMM (mes abreviado en inglés)', () => {
    const result = processExcelDate('11-Apr');
    expect(result.getDate()).toBe(11);
    expect(result.getMonth()).toBe(3);
  });

  it('convierte un número serial de Excel', () => {
    // 44587 corresponde a 2022-01-26 en el calendario de Excel.
    const result = processExcelDate(44587);
    expect(result.getDate()).toBe(26);
    expect(result.getMonth()).toBe(0);
  });
});

describe('buildYoungDataFromRow', () => {
  it('retorna null si no hay nombre', () => {
    const warnings: string[] = [];
    expect(buildYoungDataFromRow({}, 0, warnings)).toBeNull();
  });

  it('combina fullName y lastName', () => {
    const warnings: string[] = [];
    const data = buildYoungDataFromRow(
      { fullName: 'Ana', lastName: 'Pérez' },
      0,
      warnings
    );
    expect(data?.fullName).toBe('Ana Pérez');
  });

  it('agrega +57 a un celular de 10 dígitos sin indicativo', () => {
    const warnings: string[] = [];
    const data = buildYoungDataFromRow(
      { fullName: 'Ana', phone: '3001234567' },
      0,
      warnings
    );
    expect(data?.phone).toBe('+573001234567');
  });

  it('ignora un grupo inválido y agrega una advertencia', () => {
    const warnings: string[] = [];
    const data = buildYoungDataFromRow(
      { fullName: 'Ana', group: '9' },
      2,
      warnings
    );
    expect(data?.group).toBeUndefined();
    expect(warnings[0]).toMatch(/Fila 3/);
  });

  it('detecta género femenino/masculino desde texto libre', () => {
    const warnings: string[] = [];
    expect(
      buildYoungDataFromRow({ fullName: 'Ana', gender: 'Mujer' }, 0, warnings)
        ?.gender
    ).toBe('femenino');
    expect(
      buildYoungDataFromRow({ fullName: 'Luis', gender: 'Hombre' }, 0, warnings)
        ?.gender
    ).toBe('masculino');
  });

  it('usa "joven adventista" como rol por defecto', () => {
    const warnings: string[] = [];
    const data = buildYoungDataFromRow({ fullName: 'Ana' }, 0, warnings);
    expect(data?.role).toBe('joven adventista');
  });
});

describe('importYoungsFromRows', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reporta error cuando falta el nombre', async () => {
    const results = await importYoungsFromRows([{ Celular: '3001234567' }]);

    expect(results.errors).toEqual([
      expect.objectContaining({ row: 1, error: 'Nombre requerido' }),
    ]);
    expect(results.imported).toBe(0);
  });

  it('rechaza un email duplicado sin crear el registro', async () => {
    mockedYoung.findOne.mockResolvedValueOnce({ _id: 'existing' } as any);

    const results = await importYoungsFromRows([
      { Nombre: 'Ana', Email: 'ana@test.com' },
    ]);

    expect(results.errors[0].error).toMatch(/ya existe en la base de datos/);
    expect(results.imported).toBe(0);
  });

  it('agrega una advertencia cuando el nombre ya existe (sin email)', async () => {
    mockedYoung.findOne.mockResolvedValueOnce({ _id: 'existing' } as any);

    const results = await importYoungsFromRows([{ Nombre: 'Ana' }]);

    expect(results.warnings[0]).toMatch(/ya existe en la base de datos/);
    expect(results.imported).toBe(0);
  });

  it('crea un joven nuevo cuando no hay duplicados', async () => {
    mockedYoung.findOne.mockResolvedValue(null);
    const validate = jest.fn().mockResolvedValue(undefined);
    const save = jest.fn().mockResolvedValue(undefined);
    (mockedYoung as any).mockImplementation((data: any) => ({
      ...data,
      validate,
      save,
    }));

    const results = await importYoungsFromRows([{ Nombre: 'Ana' }]);

    expect(validate).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(results.imported).toBe(1);
  });

  it('actualiza un joven existente cuando la fila trae un ID válido', async () => {
    const validate = jest.fn().mockResolvedValue(undefined);
    const save = jest.fn().mockResolvedValue(undefined);
    mockedYoung.findById.mockResolvedValue({
      fullName: 'Vieja',
      validate,
      save,
    } as any);

    const results = await importYoungsFromRows([
      { ID: '507f1f77bcf86cd799439011', Nombre: 'Ana Actualizada' },
    ]);

    expect(validate).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(results.updated).toBe(1);
    expect(results.imported).toBe(0);
  });

  it('reporta error si el ID de la fila no es válido', async () => {
    const results = await importYoungsFromRows([
      { ID: 'no-es-un-id', Nombre: 'Ana' },
    ]);

    expect(results.errors[0].error).toBe('ID inválido');
  });
});
