// Resumen de la temporada al estilo de las estadísticas de un partido: pensado
// para verse completo en pantalla (proyector), con números animados.
import type { ISeasonPersonStats } from '../../../types';
import type { CeremonyData, CeremonyPerson } from './ceremony';
import { el, portrait } from './dom';

type Stat = [label: string, read: (s: ISeasonPersonStats) => number, suffix?: string];

const ATTENDANCE: Stat[] = [
  ['Asistencias', s => s.attendanceCount],
  ['% de asistencia', s => s.attendancePercent, '%'],
  ['Mejor racha (semanas)', s => s.bestStreakWeeks],
  ['Llegadas tempranas', s => s.earlyArrivals],
];

const PARTICIPATION: Stat[] = [
  ['Amigos referidos', s => s.referrals],
  ['Actividades realizadas', s => s.activities],
  ['Formularios respondidos', s => s.forms],
];

// De dónde salieron los puntos de cada barra
const SOURCES: [label: string, key: keyof ISeasonPersonStats['points']][] = [
  ['Asistencia', 'attendance'],
  ['Actividades', 'activity'],
  ['Referidos', 'referrals'],
  ['Formularios y eventos', 'forms'],
  ['Cumpleaños', 'birthday'],
  ['Bonus', 'bonus'],
];

const format = new Intl.NumberFormat('es-CO');
const COUNT_MS = 1100;

export const hasSummary = (data: CeremonyData) =>
  data.podium.length > 0 && data.podium.every(p => p.stats);

/** Número que sube de 0 a su valor cuando le toca aparecer */
function counter(value: number, delay: number, suffix = '') {
  const node = el('b', 'sm-number', format.format(value) + suffix);
  if (value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return node;
  }
  node.textContent = '0' + suffix;
  let start = 0;
  const tick = (time: number) => {
    start ||= time + delay;
    const progress = Math.max(0, Math.min((time - start) / COUNT_MS, 1));
    node.textContent =
      format.format(Math.round(value * (1 - (1 - progress) ** 3))) + suffix;
    // Si el resumen se cerró, el nodo ya no está en la página
    if (progress < 1 && node.isConnected) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
  return node;
}

const face = (person: CeremonyPerson) => {
  const frame = portrait(person);
  frame.classList.add('sm-face');
  return frame;
};

const delayed = <T extends HTMLElement>(node: T, delay: number) => {
  node.style.setProperty('--delay', delay + 'ms');
  return node;
};

type Podium = CeremonyData['podium'];

/**
 * Una sola gráfica: una barra por persona, del color de su puesto, con sus
 * puntos totales. Debajo, de dónde salieron y las demás cifras.
 */
function chart(podium: Podium, from: number) {
  const box = delayed(el('section', 'sm-chart'), from);
  const stats = podium.map(p => p.stats as ISeasonPersonStats);
  const maxTotal = Math.max(...podium.map(p => p.points), 1);
  const sources = SOURCES.filter(([, key]) => stats.some(s => s.points[key] > 0));
  const figures = [...ATTENDANCE, ...PARTICIPATION].filter(([, read]) =>
    stats.some(s => read(s) > 0)
  );

  podium.forEach((person, index) => {
    const own = stats[index];
    const delay = from + 150 + index * 220;
    const row = delayed(el('div', 'sm-entry'), delay);
    row.dataset.place = String(person.place);

    const photo = el('div', 'sm-photo');
    photo.append(face(person), el('span', 'sm-medal', `${person.place}.º`));
    const name = el('div', 'sm-info');
    name.append(
      el('span', 'sm-place', `${person.place}.º lugar`),
      el('span', 'sm-name', person.name)
    );
    const who = el('div', 'sm-person');
    who.append(photo, name);

    const track = el('div', 'sm-track');
    const bar = el('div', 'sm-fill');
    bar.style.width = (Math.max(person.points, 0) / maxTotal) * 100 + '%';
    track.append(bar);
    const total = el('p', 'sm-total');
    total.append(counter(person.points, delay), el('span', '', ' pts'));
    const line = el('div', 'sm-barline');
    line.append(track, total);

    const breakdown = el('ul', 'sm-breakdown');
    for (const [label, key] of sources) {
      if (own.points[key] <= 0) continue;
      const item = el('li', '', label + ' ');
      item.append(counter(own.points[key], delay));
      breakdown.append(item);
    }

    const list = el('dl', 'sm-figures');
    const tile = (label: string, value: HTMLElement) => {
      const item = el('div', 'sm-figure');
      const dd = el('dd', '');
      dd.append(value);
      item.append(el('dt', '', label), dd);
      list.append(item);
    };
    for (const [label, read, suffix] of figures) {
      tile(label, counter(read(own), delay + 150, suffix));
    }
    if (stats.some(s => s.streakBonus)) {
      tile(
        'Premio 4 sábados',
        el('b', 'sm-number', own.streakBonus ? 'Sí' : 'No')
      );
    }

    const body = el('div', 'sm-body');
    body.append(line, breakdown, list);
    row.append(who, body);
    box.append(row);
  });

  return box;
}

export function renderSummary(container: HTMLElement, data: CeremonyData) {
  const podium = [...data.podium].sort((a, b) => a.place - b.place);

  const header = el('header', 'sm-header');
  header.append(
    el('h2', 'sm-title', 'Resumen de la temporada'),
    el(
      'p',
      'sm-subtitle',
      data.totalDays
        ? `${data.seasonName} · ${data.totalDays} días con asistencia`
        : data.seasonName
    )
  );

  const nodes: HTMLElement[] = [header, chart(podium, 250)];

  for (const winner of data.constancy.winners) {
    const stats = winner.stats;
    if (!stats) continue;
    const strip = delayed(el('section', 'sm-constancy'), 1000);
    const who = el('div', 'sm-who');
    const info = el('div', 'sm-info');
    info.append(
      el('span', 'sm-place', 'Bonus constancia'),
      el('span', 'sm-name', winner.name)
    );
    who.append(face(winner), info);

    const list = el('dl', 'sm-facts');
    const facts: Stat[] = [
      ...ATTENDANCE,
      ['Puntos totales', s => s.totalPoints],
      ...PARTICIPATION,
    ];
    let delay = 1100;
    for (const [label, read, suffix] of facts) {
      const value = read(stats);
      if (value <= 0) continue;
      delay += 80;
      const item = delayed(el('div', 'sm-fact'), delay);
      const dd = el('dd', '');
      dd.append(counter(value, delay, suffix));
      item.append(el('dt', '', label), dd);
      list.append(item);
    }
    strip.append(who, list);
    nodes.push(strip);
  }

  container.replaceChildren(...nodes);
}
