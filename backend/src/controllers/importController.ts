import { Request, Response } from 'express';
import xlsx from 'xlsx';
import Young from '../models/Young';
import { uploadToCloudinary } from '../config/cloudinary';
import { DateTime } from 'luxon';

// Función mejorada para procesar fecha de cumpleaños desde Excel usando Luxon
const processExcelDate = (dateValue: any): Date => {
  if (!dateValue) {
    // Si no hay fecha, usar 1 de enero del año actual
    return DateTime.now().set({ month: 1, day: 1 }).toJSDate();
  }

  // Si es una fecha de Excel (número serial)
  if (typeof dateValue === 'number') {
    try {
      // Convertir número serial de Excel a fecha usando Luxon
      // Excel cuenta desde 1900-01-01, pero tiene un error con 1900 siendo bisiesto
      const excelEpoch = DateTime.fromObject({ year: 1900, month: 1, day: 1 });
      
      let daysToAdd = dateValue - 1; // Excel cuenta desde día 1, no 0
      
      // Compensar por el error de Excel con el año 1900 (considera 1900 bisiesto incorrectamente)
      if (dateValue >= 60) {
        daysToAdd = dateValue - 2;
      }
      
      const calculatedDate = excelEpoch.plus({ days: daysToAdd });
      
      // Solo usar día y mes del año actual
      const currentYear = DateTime.now().year;
      const resultDate = calculatedDate.set({ year: currentYear });
      
      return resultDate.toJSDate();
    } catch (error) {
      console.warn(`Error procesando número serial de Excel: ${dateValue}`, error);
      return DateTime.now().toJSDate();
    }
  }

  // Si es un string, intentar parsearlo con Luxon
  if (typeof dateValue === 'string') {
    const dateStr = dateValue.trim();
    
    // Intentar diferentes formatos con Luxon
    const formats = [
      'dd-MMM',      // 26-Jan
      'dd-MMM-yyyy', // 26-Jan-2022
      'dd/MM',       // 26/01
      'dd/MM/yyyy',  // 26/01/2022
      'dd/MM/yy',    // 26/01/22
      'yyyy-MM-dd',  // 2022-01-26 (ISO)
      'MM/dd/yyyy',  // 01/26/2022 (formato US)
      'dd-MM-yyyy',  // 26-01-2022
      'dd.MM.yyyy'   // 26.01.2022
    ];

    for (const format of formats) {
      try {
        const parsedDate = DateTime.fromFormat(dateStr, format, { locale: 'en' });
        
        if (parsedDate.isValid) {
          // Si no tiene año o es formato corto, usar año actual
          if (format === 'dd-MMM' || format === 'dd/MM') {
            const currentYear = DateTime.now().year;
            return parsedDate.set({ year: currentYear }).toJSDate();
          }
          
          return parsedDate.toJSDate();
        }
      } catch (error) {
        // Continuar con el siguiente formato
        continue;
      }
    }
    
    // Intentar con el parser nativo de Luxon
    try {
      const luxonDate = DateTime.fromISO(dateStr);
      if (luxonDate.isValid) {
        return luxonDate.toJSDate();
      }
      
      // Intentar con formato RFC2822
      const rfc2822Date = DateTime.fromRFC2822(dateStr);
      if (rfc2822Date.isValid) {
        return rfc2822Date.toJSDate();
      }
      
      // Intentar con formato HTTP
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

// Función mejorada para calcular rango de edad usando Luxon
const calculateAgeRange = (birthday: Date): string => {
  try {
    const birthdayLuxon = DateTime.fromJSDate(birthday);
    const today = DateTime.now();
    
    if (!birthdayLuxon.isValid) {
      console.warn('Fecha de cumpleaños inválida, usando rango por defecto');
      return '22-25';
    }

    const age = Math.floor(today.diff(birthdayLuxon, 'years').years);

    // Validar que la edad sea razonable
    if (age < 0 || age > 80) {

      
      // Si la edad es extraña, probablemente necesitamos usar solo día/mes del año actual
      const correctedBirthday = birthdayLuxon.set({ year: today.year });
      const correctedAge = Math.floor(today.diff(correctedBirthday, 'years').years);
      
      if (correctedAge >= 0 && correctedAge <= 80) {
        return getAgeRangeFromAge(correctedAge);
      }
      
      return '22-25'; // Valor por defecto
    }

    return getAgeRangeFromAge(age);
  } catch (error) {
    console.warn('Error calculando edad:', error);
    return '22-25';
  }
};

// Función auxiliar para determinar rango de edad
const getAgeRangeFromAge = (age: number): string => {
  if (age >= 13 && age <= 15) return '13-15';
  if (age >= 16 && age <= 18) return '16-18';
  if (age >= 19 && age <= 21) return '19-21';
  if (age >= 22 && age <= 25) return '22-25';
  if (age >= 26 && age <= 30) return '26-30';
  return '30+';
};

// Función para normalizar nombres de columnas
const normalizeColumnName = (name: string): string => {
  return name.toLowerCase()
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

export const importYoungFromExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    // Leer el archivo Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo Excel está vacío'
      });
    }

    const results = {
      total: data.length,
      imported: 0,
      errors: [] as any[],
      warnings: [] as string[]
    };

    // Mapeo de columnas comunes
    const columnMapping: { [key: string]: string } = {
      'nombre': 'fullName',
      'name': 'fullName',
      'nombres': 'fullName',
      'apellido': 'lastName',
      'apellidos': 'lastName',
      'lastname': 'lastName',
      'telefono': 'phone',
      'phone': 'phone',
      'celular': 'phone',
      'movil': 'phone',
      'fecha_cumpleanos': 'birthday',
      'fecha_cumple': 'birthday',
      'cumpleanos': 'birthday',
      'birthday': 'birthday',
      'rango_edad': 'ageRange',
      'edad': 'ageRange',
      'age': 'ageRange',
      'genero': 'gender',
      'sexo': 'gender',
      'gender': 'gender',
      'rol': 'role',
      'role': 'role',
      'cargo': 'role',
      'email': 'email',
      'correo': 'email',
      'mail': 'email'
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row: any = data[i];
        
        // Normalizar las claves del objeto
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = normalizeColumnName(key);
          const mappedKey = columnMapping[normalizedKey] || normalizedKey;
          normalizedRow[mappedKey] = row[key];
        });

        // Combinar nombre y apellido si están separados
        let fullName = '';
        if (normalizedRow.fullName) {
          fullName = normalizedRow.fullName.toString().trim() + (normalizedRow.lastName ? ` ${normalizedRow.lastName.toString().trim()}` : '');
        }

        if (!fullName) {
          results.errors.push({
            row: i + 1,
            error: 'Nombre requerido',
            data: row
          });
          continue;
        }

        // Procesar teléfono
        let phone = '';
        if (normalizedRow.phone || normalizedRow.celular) {
          phone = (normalizedRow.phone || normalizedRow.celular).toString().trim();
          // Limpiar y formatear teléfono
          phone = phone.replace(/[^\d+]/g, '');
          
          // Si no tiene indicativo y tiene 10 dígitos, agregar +57 (Colombia)
          if (!phone.startsWith('+') && phone.length === 10) {
            phone = '+57' + phone;
          }
          // Si ya tiene indicativo válido (+57, +1, etc.), mantenerlo
          else if (phone.startsWith('+')) {
            // Ya tiene formato correcto
            phone = phone;
          }
          // Si no tiene + pero empieza con código de país conocido
          else if (phone.startsWith('57') && phone.length === 12) {
            phone = '+' + phone;
          }
          else if (phone.startsWith('1') && phone.length === 11) {
            phone = '+' + phone;
          }
        }

        // Procesar fecha de cumpleaños usando Luxon
        let birthday: Date;
        const birthdayValue = normalizedRow.birthday || normalizedRow.fecha_cumpleanos;
        
        // Si la fecha viene con año completo (como 17/03/2022), usarla tal como está
        if (typeof birthdayValue === 'string' && birthdayValue.includes('/')) {
          const parts = birthdayValue.split('/');
          if (parts.length === 3) {
            try {
              // Formato dd/mm/yyyy
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              let year = parseInt(parts[2]);
              
              // Si el año es menor a 1900, asumir que es año actual
              if (year < 1900) {
                year = DateTime.now().year;
              }
              
              const luxonDate = DateTime.fromObject({ year, month, day });
              birthday = luxonDate.isValid ? luxonDate.toJSDate() : processExcelDate(birthdayValue);
            } catch (error) {
              birthday = processExcelDate(birthdayValue);
            }
          } else {
            birthday = processExcelDate(birthdayValue);
          }
        } else {
          birthday = processExcelDate(birthdayValue);
        }

        // Determinar rango de edad
        const ageRange = normalizedRow.ageRange || calculateAgeRange(birthday);

        // Procesar género
        let gender = '';
        if (normalizedRow.gender) {
          const genderStr = normalizedRow.gender.toString().toLowerCase().trim();
          if (genderStr.includes('f') || genderStr.includes('mujer') || genderStr.includes('fem')) {
            gender = 'femenino';
          } else if (genderStr.includes('m') || genderStr.includes('hombre') || genderStr.includes('masc')) {
            gender = 'masculino';
          }
        }

        // Procesar rol
        let role: any = 'joven adventista';
        if (normalizedRow.role) {
          const roleStr = normalizedRow.role.toString().toLowerCase();
          const roles = ['lider juvenil', 'colaborador', 'director', 'subdirector', 
                        'club guias', 'club conquistadores', 'club aventureros', 'escuela sabatica', 'joven adventista', 'simpatizante'];
          const foundRole = roles.find(r => roleStr.includes(r.replace(' ', '')));
          if (foundRole) role = foundRole;
        }

        // Crear el joven
        const youngData = {
          fullName,
          phone: phone,
          birthday,
          ageRange,
          gender,
          role,
          email: normalizedRow.email,
          skills: []
        };

        // Verificar si ya existe un joven con el mismo nombre
        const existingYoung = await Young.findOne({ 
          fullName: { $regex: new RegExp(`^${fullName}$`, 'i') }
        });

        if (existingYoung) {
          results.warnings.push(`Fila ${i + 1}: ${fullName} ya existe en la base de datos`);
          continue;
        }

        // Crear el nuevo joven
        const newYoung = new Young(youngData);
        await newYoung.save();
        
        results.imported++;

      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: data[i]
        });
      }
    }

    res.json({
      success: true,
      message: `Importación completada. ${results.imported} de ${results.total} registros importados.`,
      data: results
    });

  } catch (error: any) {
    console.error('Error importing Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo Excel',
      error: error.message
    });
  }
};

export const downloadImportTemplate = async (req: Request, res: Response) => {
  try {
    // Usar Luxon para generar fechas de ejemplo más precisas
    const currentYear = DateTime.now().year;
    
    const templateData = [
      {
        'Nombre': 'María Fernanda',
        'Apellido': 'Cortés',
        'Fecha cumpleaños': '26/01',
        'Rango de edad': '26-30',
        'Celular': '3017291160',
        'Género': 'femenino',
        'Rol': 'lider juvenil',
        'Email': 'maria.fernanda@email.com'
      },
      {
        'Nombre': 'Diego Mauricio',
        'Apellido': 'Díaz',
        'Fecha cumpleaños': `17/03/${currentYear}`,
        'Rango de edad': '30-35',
        'Celular': '3014470620',
        'Género': 'masculino',
        'Rol': 'director',
        'Email': 'diego.mauricio@email.com'
      },
      {
        'Nombre': 'Santiago',
        'Apellido': 'Bayona',
        'Fecha cumpleaños': '11-Apr',
        'Rango de edad': '15-18',
        'Celular': '3012291049',
        'Género': 'masculino',
        'Rol': 'colaborador',
        'Email': 'santiago.bayona@email.com'
      }
    ];

    // Instrucciones mejoradas con información sobre Luxon
    const instructionsData = [
      { 'CAMPO': '📅 FORMATOS DE FECHA SOPORTADOS:', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': 'DD/MM (día/mes)', 'REQUERIDO': '', 'FORMATO': '26/01', 'EJEMPLO': '26 de enero del año actual' },
      { 'CAMPO': 'DD/MM/YYYY (día/mes/año)', 'REQUERIDO': '', 'FORMATO': '26/01/1995', 'EJEMPLO': '26 de enero de 1995' },
      { 'CAMPO': 'DD-MMM (día-mes abreviado)', 'REQUERIDO': '', 'FORMATO': '26-Jan', 'EJEMPLO': '26 de enero del año actual' },
      { 'CAMPO': 'Número serial de Excel', 'REQUERIDO': '', 'FORMATO': '44587', 'EJEMPLO': 'Se convierte automáticamente' },
      { 'CAMPO': '', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': 'CAMPOS REQUERIDOS:', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': 'Nombre', 'REQUERIDO': 'SÍ', 'FORMATO': 'Texto', 'EJEMPLO': 'María Fernanda' },
      { 'CAMPO': 'Apellido', 'REQUERIDO': 'NO', 'FORMATO': 'Texto', 'EJEMPLO': 'Cortés' },
      { 'CAMPO': 'Fecha cumpleaños', 'REQUERIDO': 'NO', 'FORMATO': 'Ver formatos arriba', 'EJEMPLO': '26/01 o 26-Jan' },
      { 'CAMPO': 'Rango de edad', 'REQUERIDO': 'NO', 'FORMATO': '13-15, 16-18, 19-21, 22-25, 26-30, 30+', 'EJEMPLO': '26-30' },
      { 'CAMPO': 'Celular', 'REQUERIDO': 'NO', 'FORMATO': '10 dígitos (se agrega +57)', 'EJEMPLO': '3017291160' },
      { 'CAMPO': 'Género', 'REQUERIDO': 'NO', 'FORMATO': 'masculino o femenino', 'EJEMPLO': 'femenino' },
      { 'CAMPO': 'Rol', 'REQUERIDO': 'NO', 'FORMATO': 'Ver roles disponibles abajo', 'EJEMPLO': 'lider juvenil' },
      { 'CAMPO': 'Email', 'REQUERIDO': 'NO', 'FORMATO': 'correo@dominio.com', 'EJEMPLO': 'maria@email.com' },
      { 'CAMPO': '', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': 'ROLES DISPONIBLES:', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- lider juvenil', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- colaborador', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- director', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- subdirector', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- club guias', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- club conquistadores', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- club aventureros', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' },
      { 'CAMPO': '- escuela sabatica', 'REQUERIDO': '', 'FORMATO': '', 'EJEMPLO': '' }
    ];

    const workbook = xlsx.utils.book_new();
    
    // Hoja principal con datos de ejemplo
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Datos Jóvenes');
    
    // Hoja de instrucciones
    const instructionsSheet = xlsx.utils.json_to_sheet(instructionsData);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_jovenes_ministerio.xlsx');
    res.send(buffer);

  } catch (error: any) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar la plantilla',
      error: error.message
    });
  }
};
