import {
  BirthdayRow,
  buildReport,
  monthsOfSemester,
  normalizeName,
  parseBirthdayString,
  reportToCsv,
  sortKey,
} from './birthdayReportService';

const row = (name: string, month: number, day: number, origin = 'Grupo 1'): BirthdayRow => ({
  name,
  month,
  day,
  origin,
});

describe('monthsOfSemester', () => {
  it('S1 es enero-junio y S2 julio-diciembre', () => {
    expect(monthsOfSemester(1)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(monthsOfSemester(2)).toEqual([6, 7, 8, 9, 10, 11]);
  });
});

describe('normalizeName / sortKey', () => {
  it('ignora tildes, mayúsculas y espacios dobles', () => {
    expect(normalizeName('  Andrés   FELIPE ')).toBe('andres felipe');
  });
  it('ignora el "Pr." al ordenar', () => {
    expect(sortKey('Pr. Ricardo Rodríguez')).toBe('ricardo rodriguez');
  });
});

describe('parseBirthdayString', () => {
  it('lee YYYY-MM-DD', () => {
    expect(parseBirthdayString('2002-07-05')).toEqual({ month: 6, day: 5 });
  });
  it('rechaza valores inválidos', () => {
    expect(parseBirthdayString('05/07/2002')).toBeNull();
    expect(parseBirthdayString('2002-13-05')).toBeNull();
    expect(parseBirthdayString(undefined)).toBeNull();
  });
});

describe('buildReport', () => {
  it('deja solo los meses del semestre, agrupados y en orden alfabético', () => {
    const report = buildReport(
      [
        row('Yulieth Alban', 7, 8),
        row('Andrés Felipe Bayona', 8, 20),
        row('Andres Pelaez', 8, 23),
        row('Camilo Tovar', 2, 15), // marzo: fuera del S2
        row('Pr. Ricardo Rodríguez', 8, 23),
        row('Angelica Cabrera', 6, 1),
      ],
      2
    );

    expect(report.groups.map(g => g.label)).toEqual([
      'JULIO',
      'AGOSTO',
      'SEPTIEMBRE',
      'OCTUBRE',
      'NOVIEMBRE',
      'DICIEMBRE',
    ]);
    const septiembre = report.groups.find(g => g.label === 'SEPTIEMBRE')!;
    expect(septiembre.rows.map(r => r.name)).toEqual([
      'Andrés Felipe Bayona',
      'Andres Pelaez',
      'Pr. Ricardo Rodríguez',
    ]);
    expect(report.total).toBe(5);
  });

  it('no repite un nombre que llega de dos fuentes y prefiere la primera', () => {
    const report = buildReport(
      [row('Luz Helena Zapata', 11, 11), row('luz helena zapata', 11, 11, 'Invitado manual')],
      2
    );
    expect(report.total).toBe(1);
    expect(report.groups[5].rows[0].origin).toBe('Grupo 1');
  });
});

describe('buildReport: invitado que ya es del grupo 1', () => {
  it('descarta al invitado con nombre abreviado si coincide día, mes y primer nombre', () => {
    const report = buildReport(
      [
        row('Luz Helena Zapata', 11, 11),
        row('Luz H Zapata C', 11, 11, 'Invitado formulario'),
        row('Luz Marina Ríos', 11, 12, 'Invitado formulario'), // otro día: se queda
      ],
      2
    );
    expect(report.groups[5].rows.map(r => r.name)).toEqual([
      'Luz Helena Zapata',
      'Luz Marina Ríos',
    ]);
  });
});

describe('reportToCsv', () => {
  it('arma encabezado por mes con conteo, filas y total', () => {
    const csv = reportToCsv(
      buildReport([row('Gabriela Carvajal', 7, 16, 'Invitado manual')], 2)
    );
    expect(csv.startsWith('﻿Mes,Nombre completo,Cumpleaños (día/mes),Origen')).toBe(true);
    expect(csv).toContain('AGOSTO (1),,,');
    expect(csv).toContain(',Gabriela Carvajal,16/08,Invitado manual');
    expect(csv).toContain('JULIO (0),,,');
    expect(csv.trimEnd().endsWith('Total registrados: 1,,,')).toBe(true);
  });

  it('escapa nombres con coma', () => {
    const csv = reportToCsv(buildReport([row('Pérez, Juan', 6, 1)], 2));
    expect(csv).toContain('"Pérez, Juan"');
  });
});
