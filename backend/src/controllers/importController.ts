import { Request, Response } from 'express';
import xlsx from 'xlsx';
import Young from '../models/Young';
import { DateTime } from 'luxon';
import { formatDateColombia } from '../utils/dateUtils';
import { importYoungsFromRows } from '../services/importService';

export const importYoungFromExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo',
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo Excel está vacío',
      });
    }

    const results = await importYoungsFromRows(data as Record<string, any>[]);

    res.json({
      success: true,
      message: `Importación completada. Creados: ${results.imported}, Actualizados: ${results.updated}, Total procesados: ${results.imported + results.updated} de ${results.total}`,
      summary: {
        total: results.total,
        created: results.imported,
        updated: results.updated,
        errors: results.errors.length,
      },
      data: results,
    });
  } catch (error: any) {
    console.error('Error importing Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo Excel',
      error: error.message,
    });
  }
};

export const exportYoungsToExcel = async (req: Request, res: Response) => {
  try {
    const youngs = await Young.find({}).sort({ fullName: 1 });

    const rows = youngs.map(y => ({
      ID: (y._id as any).toString(),
      Nombre: y.fullName || '',
      Apellido: '',
      'Fecha cumpleaños': y.birthday ? formatDateColombia(y.birthday) : '',
      'Rango de edad': y.ageRange || '',
      Celular: y.phone || '',
      Género: y.gender || '',
      Rol: y.role || '',
      Email: y.email || '',
      Habilidades: Array.isArray(y.skills) ? y.skills.join(', ') : '',
      Grupo: y.group !== undefined ? String(y.group) : '',
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Jóvenes');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=jovenes_export.xlsx'
    );
    res.send(buffer);
  } catch (error: any) {
    console.error('Error exporting to Excel:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Error al exportar',
        error: error.message,
      });
  }
};

export const downloadImportTemplate = async (req: Request, res: Response) => {
  try {
    // Usar Luxon para generar fechas de ejemplo más precisas
    const currentYear = DateTime.now().year;

    const templateData = [
      {
        ID: '', // Vacío para nuevos registros
        Nombre: 'María Fernanda',
        Apellido: 'Cortés',
        'Fecha cumpleaños': '26/01',
        'Rango de edad': '26-30',
        Celular: '3017291160',
        Género: 'femenino',
        Rol: 'lider juvenil',
        Email: 'maria.fernanda@email.com',
        Grupo: '1',
      },
      {
        ID: '', // Vacío para nuevos registros
        Nombre: 'Diego Mauricio',
        Apellido: 'Díaz',
        'Fecha cumpleaños': `17/03/${currentYear}`,
        'Rango de edad': '30-35',
        Celular: '3014470620',
        Género: 'masculino',
        Rol: 'director',
        Email: 'diego.mauricio@email.com',
        Grupo: '3',
      },
      {
        ID: '', // Vacío para nuevos registros
        Nombre: 'Santiago',
        Apellido: 'Bayona',
        'Fecha cumpleaños': '11-Apr',
        'Rango de edad': '15-18',
        Celular: '3012291049',
        Género: 'masculino',
        Rol: 'colaborador',
        Email: 'santiago.bayona@email.com',
        Grupo: '',
      },
    ];

    // Instrucciones mejoradas con información sobre Luxon e ID
    const instructionsData = [
      {
        CAMPO: '🆔 CAMPO ID (PARA ACTUALIZAR):',
        REQUERIDO: '',
        FORMATO: '',
        EJEMPLO: '',
      },
      {
        CAMPO: 'Deje vacío para crear nuevos',
        REQUERIDO: '',
        FORMATO: '',
        EJEMPLO: '',
      },
      {
        CAMPO: 'Use ID exportado para actualizar',
        REQUERIDO: '',
        FORMATO: '6501a2b3c4d5e6f7g8h9i0j1',
        EJEMPLO: 'ID de MongoDB',
      },
      { CAMPO: '', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      {
        CAMPO: '📅 FORMATOS DE FECHA SOPORTADOS:',
        REQUERIDO: '',
        FORMATO: '',
        EJEMPLO: '',
      },
      {
        CAMPO: 'DD/MM (día/mes)',
        REQUERIDO: '',
        FORMATO: '26/01',
        EJEMPLO: '26 de enero del año actual',
      },
      {
        CAMPO: 'DD/MM/YYYY (día/mes/año)',
        REQUERIDO: '',
        FORMATO: '26/01/1995',
        EJEMPLO: '26 de enero de 1995',
      },
      {
        CAMPO: 'DD-MMM (día-mes abreviado)',
        REQUERIDO: '',
        FORMATO: '26-Jan',
        EJEMPLO: '26 de enero del año actual',
      },
      {
        CAMPO: 'Número serial de Excel',
        REQUERIDO: '',
        FORMATO: '44587',
        EJEMPLO: 'Se convierte automáticamente',
      },
      { CAMPO: '', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: 'CAMPOS REQUERIDOS:', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      {
        CAMPO: 'ID',
        REQUERIDO: 'NO',
        FORMATO: 'ObjectId de MongoDB',
        EJEMPLO: 'Vacío para crear, ID para actualizar',
      },
      {
        CAMPO: 'Nombre',
        REQUERIDO: 'SÍ',
        FORMATO: 'Texto',
        EJEMPLO: 'María Fernanda',
      },
      {
        CAMPO: 'Apellido',
        REQUERIDO: 'NO',
        FORMATO: 'Texto',
        EJEMPLO: 'Cortés',
      },
      {
        CAMPO: 'Fecha cumpleaños',
        REQUERIDO: 'NO',
        FORMATO: 'Ver formatos arriba',
        EJEMPLO: '26/01 o 26-Jan',
      },
      {
        CAMPO: 'Rango de edad',
        REQUERIDO: 'NO',
        FORMATO: '13-15, 16-18, 19-21, 22-25, 26-30, 30+',
        EJEMPLO: '26-30',
      },
      {
        CAMPO: 'Celular',
        REQUERIDO: 'NO',
        FORMATO: '10 dígitos (se agrega +57)',
        EJEMPLO: '3017291160',
      },
      {
        CAMPO: 'Género',
        REQUERIDO: 'NO',
        FORMATO: 'masculino o femenino',
        EJEMPLO: 'femenino',
      },
      {
        CAMPO: 'Rol',
        REQUERIDO: 'NO',
        FORMATO: 'Ver roles disponibles abajo',
        EJEMPLO: 'lider juvenil',
      },
      {
        CAMPO: 'Email',
        REQUERIDO: 'NO',
        FORMATO: 'correo@dominio.com',
        EJEMPLO: 'maria@email.com',
      },
      {
        CAMPO: 'Grupo',
        REQUERIDO: 'NO',
        FORMATO: 'Número 1-5',
        EJEMPLO: '1, 2, 3, 4 o 5',
      },
      { CAMPO: '', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: 'ROLES DISPONIBLES:', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: '- lider juvenil', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: '- colaborador', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: '- director', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: '- subdirector', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: '- club guias', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      {
        CAMPO: '- club conquistadores',
        REQUERIDO: '',
        FORMATO: '',
        EJEMPLO: '',
      },
      { CAMPO: '- club aventureros', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
      { CAMPO: '- escuela sabatica', REQUERIDO: '', FORMATO: '', EJEMPLO: '' },
    ];

    const workbook = xlsx.utils.book_new();

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Datos Jóvenes');

    const instructionsSheet = xlsx.utils.json_to_sheet(instructionsData);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=plantilla_jovenes_ministerio.xlsx'
    );
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar la plantilla',
      error: error.message,
    });
  }
};
