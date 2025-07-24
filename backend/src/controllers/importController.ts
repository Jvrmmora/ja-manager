import { Request, Response } from 'express';
import xlsx from 'xlsx';
import Young from '../models/Young';
import { uploadToCloudinary } from '../config/cloudinary';

// Función para procesar fecha de cumpleaños desde Excel
const processExcelDate = (dateValue: any): Date => {
  if (!dateValue) {
    // Si no hay fecha, usar 1 de enero del año actual
    return new Date(new Date().getFullYear(), 0, 1);
  }

  // Si es una fecha de Excel (número)
  if (typeof dateValue === 'number') {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    // Usar el año actual si solo tenemos día y mes
    return new Date(new Date().getFullYear(), excelDate.getMonth(), excelDate.getDate());
  }

  // Si es un string, intentar parsearlo
  if (typeof dateValue === 'string') {
    const dateStr = dateValue.trim();
    
    // Si contiene un guión y parece ser día-mes (ej: "17-mar")
    if (dateStr.includes('-')) {
      const [day, month] = dateStr.split('-');
      
      // Mapeo de nombres de meses en español e inglés
      const monthNames: { [key: string]: number } = {
        'ene': 0, 'jan': 0, 'enero': 0, 'january': 0,
        'feb': 1, 'febrero': 1, 'february': 1,
        'mar': 2, 'marzo': 2, 'march': 2,
        'abr': 3, 'apr': 3, 'abril': 3, 'april': 3,
        'may': 4, 'mayo': 4,
        'jun': 5, 'junio': 5, 'june': 5,
        'jul': 6, 'julio': 6, 'july': 6,
        'ago': 7, 'aug': 7, 'agosto': 7, 'august': 7,
        'sep': 8, 'sept': 8, 'septiembre': 8, 'september': 8,
        'oct': 9, 'octubre': 9, 'october': 9,
        'nov': 10, 'noviembre': 10, 'november': 10,
        'dic': 11, 'dec': 11, 'diciembre': 11, 'december': 11
      };
      
      const monthKey = month.toLowerCase();
      const monthIndex = monthNames[monthKey];
      
      if (monthIndex !== undefined) {
        const dayNum = parseInt(day);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          // Si viene del Excel con formato "17-mar", usar el año actual
          return new Date(new Date().getFullYear(), monthIndex, dayNum);
        }
      }
    }
    
    // Si es formato día/mes o día/mes/año
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-indexed
        let year = new Date().getFullYear(); // Año actual por defecto
        
        // Si tiene año especificado
        if (parts.length === 3) {
          const yearPart = parseInt(parts[2]);
          // Si el año es de 2 dígitos, asumir que es 20XX
          if (yearPart < 100) {
            year = 2000 + yearPart;
          } else {
            year = yearPart;
          }
        }
        
        if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          return new Date(year, month, day);
        }
      }
    }
    
    // Si es formato ISO o similar
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  // Fallback: usar fecha actual
  console.warn(`No se pudo parsear la fecha: ${dateValue}, usando fecha actual`);
  return new Date();
};

// Función para determinar rango de edad basado en la fecha de nacimiento
const calculateAgeRange = (birthday: Date): string => {
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }

  // Si la edad es negativa o muy alta, probablemente hay un error en la fecha
  if (age < 0 || age > 80) {
    console.warn(`Edad calculada inválida: ${age} años para fecha ${birthday.toISOString()}`);
    // Usar año actual para el cálculo
    const correctedBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
    age = today.getFullYear() - correctedBirthday.getFullYear();
    if (today.getMonth() < birthday.getMonth() || 
        (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())) {
      age--;
    }
  }

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
          fullName = normalizedRow.fullName.toString().trim();
        } else if (normalizedRow.nombre) {
          fullName = normalizedRow.nombre.toString().trim();
          if (normalizedRow.lastName || normalizedRow.apellido) {
            fullName += ` ${(normalizedRow.lastName || normalizedRow.apellido).toString().trim()}`;
          }
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
          if (!phone.startsWith('+57') && phone.length === 10) {
            phone = '+57' + phone;
          }
        }

        // Procesar fecha de cumpleaños
        let birthday: Date;
        const birthdayValue = normalizedRow.birthday || normalizedRow.fecha_cumpleanos;
        
        // Si la fecha viene con año completo (como 17/03/2022), usarla tal como está
        if (typeof birthdayValue === 'string' && birthdayValue.includes('/')) {
          const parts = birthdayValue.split('/');
          if (parts.length === 3) {
            // Formato dd/mm/yyyy
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            let year = parseInt(parts[2]);
            
            // Si el año es menor a 1900, asumir que es año actual
            if (year < 1900) {
              year = new Date().getFullYear();
            }
            
            birthday = new Date(year, month, day);
          } else {
            birthday = processExcelDate(birthdayValue);
          }
        } else {
          birthday = processExcelDate(birthdayValue);
        }

        // Determinar rango de edad
        const ageRange = normalizedRow.ageRange || calculateAgeRange(birthday);

        // Procesar género
        let gender: 'masculino' | 'femenino' = 'masculino';
        if (normalizedRow.gender) {
          const genderStr = normalizedRow.gender.toString().toLowerCase();
          if (genderStr.includes('f') || genderStr.includes('mujer') || genderStr.includes('fem')) {
            gender = 'femenino';
          }
        }

        // Procesar rol
        let role: any = 'colaborador';
        if (normalizedRow.role) {
          const roleStr = normalizedRow.role.toString().toLowerCase();
          const roles = ['lider juvenil', 'colaborador', 'director', 'subdirector', 
                        'club guias', 'club conquistadores', 'club aventureros', 'escuela sabatica'];
          const foundRole = roles.find(r => roleStr.includes(r.replace(' ', '')));
          if (foundRole) role = foundRole;
        }

        // Crear el joven
        const youngData = {
          fullName,
          phone: phone || `+57300${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`, // Teléfono temporal si no existe
          birthday,
          ageRange,
          gender,
          role,
          email: normalizedRow.email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@temp.com`,
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
    // Crear plantilla de Excel con las columnas exactas que espera la API
    const templateData = [
      {
        'Nombre': 'María Fernanda',
        'Apellido': 'Cortés',
        'Fecha cumpleaños': '26-Jan',
        'Rango de edad': '26-30',
        'Celular': '3017291160',
        'Género': 'femenino',
        'Rol': 'lider juvenil',
        'Email': 'maria.fernanda@email.com'
      },
      {
        'Nombre': 'Diego Mauricio',
        'Apellido': 'Díaz',
        'Fecha cumpleaños': '17/03/2022',
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

    // Crear una segunda hoja con instrucciones
    const instructionsData = [
      { 'CAMPO': 'Nombre', 'REQUERIDO': 'SÍ', 'FORMATO': 'Texto', 'EJEMPLO': 'María Fernanda' },
      { 'CAMPO': 'Apellido', 'REQUERIDO': 'NO', 'FORMATO': 'Texto', 'EJEMPLO': 'Cortés' },
      { 'CAMPO': 'Fecha cumpleaños', 'REQUERIDO': 'NO', 'FORMATO': '26-Jan o 17/03/2022', 'EJEMPLO': '26-Jan' },
      { 'CAMPO': 'Rango de edad', 'REQUERIDO': 'NO', 'FORMATO': '13-15, 16-18, 19-21, 22-25, 26-30, 30+', 'EJEMPLO': '26-30' },
      { 'CAMPO': 'Celular', 'REQUERIDO': 'NO', 'FORMATO': '10 dígitos (se agrega +57)', 'EJEMPLO': '3017291160' },
      { 'CAMPO': 'Género', 'REQUERIDO': 'NO', 'FORMATO': 'masculino o femenino', 'EJEMPLO': 'femenino' },
      { 'CAMPO': 'Rol', 'REQUERIDO': 'NO', 'FORMATO': 'Ver opciones abajo', 'EJEMPLO': 'lider juvenil' },
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

    // Generar buffer
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
