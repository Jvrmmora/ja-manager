import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import Young from '../models/Young';

export interface ImportRowError {
  row: number;
  error: string;
  data: any;
}

export interface ImportResults {
  total: number;
  imported: number;
  updated: number;
  errors: ImportRowError[];
  warnings: string[];
}

/**
 * Convierte el valor de fecha de una celda de Excel (número serial, string en
 * varios formatos, o vacío) a un `Date`. Usa día/mes del año actual cuando el
 * formato no trae año (p. ej. "26-Jan").
 */
export const processExcelDate = (dateValue: any): Date => {
  if (!dateValue) {
    return DateTime.now().set({ month: 1, day: 1 }).toJSDate();
  }

  if (typeof dateValue === 'number') {
    try {
      // Excel cuenta desde 1900-01-01, pero tiene un error con 1900 siendo
      // bisiesto: hay que compensarlo a partir del día 60.
      const excelEpoch = DateTime.fromObject({ year: 1900, month: 1, day: 1 });
      let daysToAdd = dateValue - 1;
      if (dateValue >= 60) {
        daysToAdd = dateValue - 2;
      }
      const calculatedDate = excelEpoch.plus({ days: daysToAdd });
      const currentYear = DateTime.now().year;
      return calculatedDate.set({ year: currentYear }).toJSDate();
    } catch (error) {
      console.warn(
        `Error procesando número serial de Excel: ${dateValue}`,
        error
      );
      return DateTime.now().toJSDate();
    }
  }

  if (typeof dateValue === 'string') {
    const dateStr = dateValue.trim();

    const formats = [
      'dd-MMM',
      'dd-MMM-yyyy',
      'dd/MM',
      'dd/MM/yyyy',
      'dd/MM/yy',
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd-MM-yyyy',
      'dd.MM.yyyy',
    ];

    for (const format of formats) {
      try {
        const parsedDate = DateTime.fromFormat(dateStr, format, {
          locale: 'en',
        });

        if (parsedDate.isValid) {
          if (format === 'dd-MMM' || format === 'dd/MM') {
            const currentYear = DateTime.now().year;
            return parsedDate.set({ year: currentYear }).toJSDate();
          }
          return parsedDate.toJSDate();
        }
      } catch (error) {
        continue;
      }
    }

    try {
      const luxonDate = DateTime.fromISO(dateStr);
      if (luxonDate.isValid) {
        return luxonDate.toJSDate();
      }

      const rfc2822Date = DateTime.fromRFC2822(dateStr);
      if (rfc2822Date.isValid) {
        return rfc2822Date.toJSDate();
      }

      const httpDate = DateTime.fromHTTP(dateStr);
      if (httpDate.isValid) {
        return httpDate.toJSDate();
      }
    } catch (error) {
      console.warn(`Error parseando fecha con Luxon: ${dateStr}`, error);
    }
  }

  console.warn(`No se pudo parsear la fecha: ${dateValue}, usando fecha actual`);
  return DateTime.now().toJSDate();
};

export const getAgeRangeFromAge = (age: number): string => {
  if (age >= 13 && age <= 15) return '13-15';
  if (age >= 16 && age <= 18) return '16-18';
  if (age >= 19 && age <= 21) return '19-21';
  if (age >= 22 && age <= 25) return '22-25';
  if (age >= 26 && age <= 30) return '26-30';
  return '30+';
};

export const calculateAgeRange = (birthday: Date): string => {
  try {
    const birthdayLuxon = DateTime.fromJSDate(birthday);
    const today = DateTime.now();

    if (!birthdayLuxon.isValid) {
      console.warn('Fecha de cumpleaños inválida, usando rango por defecto');
      return '22-25';
    }

    const age = Math.floor(today.diff(birthdayLuxon, 'years').years);

    if (age < 0 || age > 80) {
      const correctedBirthday = birthdayLuxon.set({ year: today.year });
      const correctedAge = Math.floor(
        today.diff(correctedBirthday, 'years').years
      );

      if (correctedAge >= 0 && correctedAge <= 80) {
        return getAgeRangeFromAge(correctedAge);
      }

      return '22-25';
    }

    return getAgeRangeFromAge(age);
  } catch (error) {
    console.warn('Error calculando edad:', error);
    return '22-25';
  }
};

export const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

const COLUMN_MAPPING: { [key: string]: string } = {
  id: 'id',
  nombre: 'fullName',
  name: 'fullName',
  nombres: 'fullName',
  apellido: 'lastName',
  apellidos: 'lastName',
  lastname: 'lastName',
  telefono: 'phone',
  phone: 'phone',
  celular: 'phone',
  movil: 'phone',
  fecha_cumpleanos: 'birthday',
  fecha_cumple: 'birthday',
  cumpleanos: 'birthday',
  birthday: 'birthday',
  rango_edad: 'ageRange',
  edad: 'ageRange',
  age: 'ageRange',
  genero: 'gender',
  sexo: 'gender',
  gender: 'gender',
  rol: 'role',
  role: 'role',
  cargo: 'role',
  email: 'email',
  correo: 'email',
  mail: 'email',
  grupo: 'group',
  group: 'group',
};

const VALID_ROLES = [
  'lider juvenil',
  'colaborador',
  'director',
  'subdirector',
  'club guias',
  'club conquistadores',
  'club aventureros',
  'escuela sabatica',
  'joven adventista',
  'simpatizante',
];

/**
 * Normaliza las claves de una fila cruda del Excel (acentos, espacios,
 * nombres de columna en español/inglés) a los nombres de campo de `Young`.
 */
export const normalizeExcelRow = (row: Record<string, any>): Record<string, any> => {
  const normalizedRow: Record<string, any> = {};
  Object.keys(row).forEach(key => {
    const normalizedKey = normalizeColumnName(key);
    const mappedKey = COLUMN_MAPPING[normalizedKey] || normalizedKey;
    normalizedRow[mappedKey] = row[key];
  });
  return normalizedRow;
};

const parsePhone = (normalizedRow: Record<string, any>): string => {
  if (!normalizedRow.phone && !normalizedRow.celular) return '';

  let phone = (normalizedRow.phone || normalizedRow.celular).toString().trim();
  phone = phone.replace(/[^\d+]/g, '');

  if (!phone.startsWith('+') && phone.length === 10) {
    phone = '+57' + phone;
  } else if (phone.startsWith('+')) {
    // Ya tiene formato correcto
  } else if (phone.startsWith('57') && phone.length === 12) {
    phone = '+' + phone;
  } else if (phone.startsWith('1') && phone.length === 11) {
    phone = '+' + phone;
  }

  return phone;
};

const parseBirthday = (normalizedRow: Record<string, any>): Date => {
  const birthdayValue = normalizedRow.birthday || normalizedRow.fecha_cumpleanos;

  // Si la fecha viene con año completo (como 17/03/2022), usarla tal como está.
  if (typeof birthdayValue === 'string' && birthdayValue.includes('/')) {
    const parts = birthdayValue.split('/');
    if (parts.length === 3) {
      try {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        if (year < 1900) {
          year = DateTime.now().year;
        }

        const luxonDate = DateTime.fromObject({ year, month, day });
        return luxonDate.isValid
          ? luxonDate.toJSDate()
          : processExcelDate(birthdayValue);
      } catch (error) {
        return processExcelDate(birthdayValue);
      }
    }
    return processExcelDate(birthdayValue);
  }

  return processExcelDate(birthdayValue);
};

const parseGender = (normalizedRow: Record<string, any>): string => {
  if (!normalizedRow.gender) return '';

  const genderStr = normalizedRow.gender.toString().toLowerCase().trim();
  if (
    genderStr.includes('f') ||
    genderStr.includes('mujer') ||
    genderStr.includes('fem')
  ) {
    return 'femenino';
  }
  if (
    genderStr.includes('m') ||
    genderStr.includes('hombre') ||
    genderStr.includes('masc')
  ) {
    return 'masculino';
  }
  return '';
};

const parseRole = (normalizedRow: Record<string, any>): string => {
  if (!normalizedRow.role) return 'joven adventista';

  const roleStr = normalizedRow.role.toString().toLowerCase();
  const foundRole = VALID_ROLES.find(r => roleStr.includes(r.replace(' ', '')));
  return foundRole || 'joven adventista';
};

const parseGroup = (
  normalizedRow: Record<string, any>,
  rowIndex: number,
  warnings: string[]
): number | undefined => {
  const g = normalizedRow.group || normalizedRow.grupo;
  if (g === undefined || g === null || g === '') return undefined;

  const parsed = parseInt(g.toString(), 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;

  warnings.push(`Fila ${rowIndex + 1}: valor de grupo inválido (${g}), se ignorará`);
  return undefined;
};

/**
 * Construye los datos de `Young` a partir de una fila ya normalizada.
 * Devuelve `null` (y registra el error) si falta el nombre, que es el único
 * campo verdaderamente requerido para importar.
 */
export const buildYoungDataFromRow = (
  normalizedRow: Record<string, any>,
  rowIndex: number,
  warnings: string[]
): Record<string, any> | null => {
  let fullName = '';
  if (normalizedRow.fullName) {
    fullName =
      normalizedRow.fullName.toString().trim() +
      (normalizedRow.lastName ? ` ${normalizedRow.lastName.toString().trim()}` : '');
  }

  if (!fullName) {
    return null;
  }

  const birthday = parseBirthday(normalizedRow);
  const ageRange = normalizedRow.ageRange || calculateAgeRange(birthday);

  return {
    fullName,
    phone: parsePhone(normalizedRow),
    birthday,
    ageRange,
    gender: parseGender(normalizedRow),
    role: parseRole(normalizedRow),
    email: normalizedRow.email,
    group: parseGroup(normalizedRow, rowIndex, warnings),
    skills: [],
  };
};

/**
 * Procesa todas las filas del Excel: por cada una, crea un `Young` nuevo o
 * actualiza uno existente (modo híbrido vía columna `id`), evitando
 * duplicados por email/nombre. Es la lógica que antes vivía inline en
 * `importController.importYoungFromExcel`.
 */
export const importYoungsFromRows = async (
  data: Record<string, any>[]
): Promise<ImportResults> => {
  const results: ImportResults = {
    total: data.length,
    imported: 0,
    updated: 0,
    errors: [],
    warnings: [],
  };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const normalizedRow = normalizeExcelRow(row);

      const youngData = buildYoungDataFromRow(normalizedRow, i, results.warnings);
      if (!youngData) {
        results.errors.push({ row: i + 1, error: 'Nombre requerido', data: row });
        continue;
      }

      let young: any = null;
      let isUpdate = false;

      if (normalizedRow.id) {
        if (mongoose.Types.ObjectId.isValid(normalizedRow.id)) {
          young = await Young.findById(normalizedRow.id);
          if (young) {
            isUpdate = true;
            Object.assign(young, youngData);
          }
        } else {
          results.errors.push({ row: i + 1, error: 'ID inválido', data: row });
          continue;
        }
      }

      if (!young) {
        if (youngData.email) {
          const existingByEmail = await Young.findOne({ email: youngData.email });
          if (existingByEmail) {
            results.errors.push({
              row: i + 1,
              error: `Email ${youngData.email} ya existe en la base de datos`,
              data: row,
            });
            continue;
          }
        }

        const existingByName = await Young.findOne({
          fullName: { $regex: new RegExp(`^${youngData.fullName}$`, 'i') },
        });

        if (existingByName) {
          results.warnings.push(
            `Fila ${i + 1}: ${youngData.fullName} ya existe en la base de datos`
          );
          continue;
        }

        young = new Young(youngData);
      }

      await young.validate();
      await young.save();

      if (isUpdate) {
        results.updated++;
      } else {
        results.imported++;
      }
    } catch (error: any) {
      results.errors.push({ row: i + 1, error: error.message, data: data[i] });
    }
  }

  return results;
};
