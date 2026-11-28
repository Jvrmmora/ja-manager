// Cinemática de premiación: intro, "Bonus constancia", revelación del 3.º,
// 2.º y 1.º y podio. Todo el DOM vive dentro de `root`.
import anchors from './anchors.json';
import { createCeremonyAudio } from './audio';
import { createPlaybackClock } from './clock';
import { el, portrait } from './dom';
import { hasSummary, renderSummary } from './summary';
import type { ISeasonPersonStats } from '../../../types';
import { buildMarkup } from './markup';

export interface CeremonyPerson {
  name: string;
  photo?: string | undefined;
  stats?: ISeasonPersonStats | undefined;
}

export interface CeremonyData {
  seasonName: string;
  totalDays: number;
  podium: (CeremonyPerson & { place: number; points: number })[];
  constancy: {
    bestStreakWeeks: number;
    winners: (CeremonyPerson & { attendanceCount: number })[];
  };
}

export interface CeremonyAssets {
  stage: string;
  podium: string;
  winner: string;
  logo: string;
  film: string;
  music: string;
}

type Point = { x: number; y: number; pool?: { x: number; y: number } };
type State = 'lista' | 'reproduciendo' | 'pausa' | 'final' | 'final-pausa';

interface Card {
  place: number;
  slot: number;
  points: number;
  name: string;
  card: HTMLElement;
  badge: HTMLElement;
  pointsBlock: HTMLElement;
  pointsValue: HTMLElement;
  pointsText: string;
  pointsReadable: string;
}

// Posición en el escenario de cada puesto: izquierda 2.º, centro 1.º, derecha 3.º
const SLOT: Record<number, number> = { 1: 1, 2: 0, 3: 2 };
const TITLES: Record<number, string> = {
  1: 'Primer lugar',
  2: 'Segundo lugar',
  3: 'Tercer lugar',
};
const FINALIST_TITLES = ['', 'Finalista', 'Dos finalistas', 'Tres finalistas'];
const PAUSE_AFTER_THIRD = 3800;
const PAUSE_AFTER_SECOND = 5000;
const CONSTANCY_HOLD = 5000;

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function createCeremony(
  root: HTMLElement,
  data: CeremonyData,
  assets: CeremonyAssets,
  onClose: () => void,
  // Presente cuando se abre desde un botón: arranca con sonido
  launch?: { audioContext?: AudioContext | undefined }
) {
  root.innerHTML = buildMarkup(assets);
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    root.querySelector(selector) as T;

  const stage = $('.cinema-stage');
  const list = $('.finalists');
  const rankTitle = $('.rank-title');
  const nameTitle = $('.name-title');
  const scoreAnnouncement = $('.score-announcement');
  const teaser = $('.teaser');
  const countdown = $('.countdown');
  const countdownNumber = $('.countdown-number');
  const opening = $('.opening');
  const film = $<HTMLVideoElement>('.opening-film');
  const confetti = $('.confetti');
  const constancy = $('.constancy');
  const constancyWeeks = $('.constancy-weeks');
  const winnersList = $('.constancy-winners');
  const replayButton = $<HTMLButtonElement>('[data-replay]');
  const pauseButton = $<HTMLButtonElement>('[data-pause]');
  const soundButton = $<HTMLButtonElement>('[data-sound]');
  const fullscreenButton = $<HTMLButtonElement>('[data-fullscreen]');
  const summaryButton = $<HTMLButtonElement>('[data-summary-open]');
  const summary = $('.summary');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const audio = createCeremonyAudio({
    openingMusic: assets.music,
    audioContext: launch?.audioContext,
  });
  const clock = createPlaybackClock();
  const wait = clock.wait;
  const format = new Intl.NumberFormat('es-CO');
  const listeners = new AbortController();

  let controller: AbortController | undefined;
  let cards: Card[] = [];
  let winnerCards: HTMLElement[] = [];
  let state: State = 'lista';
  let pausedAnimations: Animation[] = [];

  const imagesReady = Promise.allSettled(
    [...root.querySelectorAll<HTMLImageElement>('.plate, .opening-logo')].map(
      image => image.decode()
    )
  );

  const running = () => state === 'reproduciendo' || state === 'pausa';
  const onPodium = () => state === 'final' || state === 'final-pausa';
  const paused = () => state === 'pausa' || state === 'final-pausa';
  const canPause = () => running() || onPodium();

  const place = (node: HTMLElement, point: { x: number; y: number }) => {
    node.style.setProperty('--x', point.x * 100 + '%');
    node.style.setProperty('--y', point.y * 100 + '%');
  };

  root
    .querySelectorAll<HTMLElement>('.podium-numbers span')
    .forEach((label, index) => {
      place(label, anchors.finale[index].face);
      label.hidden = !data.podium.some(p => SLOT[p.place] === index);
    });

  function showName(text: string) {
    nameTitle.textContent = text;
    nameTitle.toggleAttribute('data-long', text.length > 27);
    nameTitle.toggleAttribute('data-extra-long', text.length > 53);
  }

  function loadFinalists() {
    cards = [...data.podium]
      .sort((a, b) => SLOT[a.place] - SLOT[b.place])
      .map(finalist => {
        const slot = SLOT[finalist.place];
        const card = el('li', 'finalist');
        card.dataset.place = '';

        const frame = portrait(finalist);
        const badge = el('span', 'rank-mark');
        badge.hidden = true;
        const sparkles = el('div', 'rank-sparkles');
        sparkles.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 6; i++) sparkles.append(el('i', 'podium-sparkle'));
        frame.append(badge, sparkles);

        const pointsText = format.format(finalist.points);
        const pointsReadable = `${pointsText} ${finalist.points === 1 ? 'punto' : 'puntos'}`;
        const caption = el('div', 'finalist-caption');
        const pointsBlock = el('div', 'finalist-points');
        const pointsValue = el('span', 'points-value', pointsText);
        pointsValue.setAttribute('aria-hidden', 'true');
        pointsValue.style.setProperty('--points-width', pointsText.length + 'ch');
        const unit = el('span', 'points-unit', 'pts');
        unit.setAttribute('aria-hidden', 'true');
        pointsBlock.append(
          el('span', 'screen-reader-text', pointsReadable),
          pointsValue,
          unit
        );
        caption.append(el('span', 'finalist-name', finalist.name), pointsBlock);

        card.append(frame, caption);
        place(card, anchors.intro[slot]);

        return {
          place: finalist.place,
          slot,
          points: finalist.points,
          name: finalist.name,
          card,
          badge,
          pointsBlock,
          pointsValue,
          pointsText,
          pointsReadable,
        };
      });
    list.replaceChildren(...cards.map(c => c.card));
  }

  function loadWinners() {
    const { winners, bestStreakWeeks } = data.constancy;

    winnerCards = winners.map(winner => {
      const card = el('li', 'winner-card');
      card.append(
        portrait(winner),
        el('span', 'winner-name', winner.name),
        el(
          'span',
          'winner-detail',
          plural(winner.attendanceCount, 'asistencia', 'asistencias')
        )
      );
      return card;
    });
    winnersList.replaceChildren(...winnerCards);
    $('.constancy-unit').textContent =
      bestStreakWeeks === 1 ? 'semana seguida' : 'semanas seguidas';
    constancyWeeks.textContent = '0';
  }

  function frameCamera(point = { x: 0.5, y: 0.66 }, zoom = 1) {
    const scale = reducedMotion.matches ? 1 : zoom;
    const shift = (target: number, center: number) =>
      Math.max(1 - scale, Math.min(0, target - center * scale));
    stage.style.setProperty('--zoom', String(scale));
    stage.style.setProperty('--camera-x', shift(0.5, point.x) * 100 + '%');
    stage.style.setProperty('--camera-y', shift(0.68, point.y) * 100 + '%');
  }

  function aim(point: Point, selected?: Card) {
    stage.style.setProperty('--aim', point.x * 100 + '%');
    stage.style.setProperty('--floor', (point.pool?.y ?? 0.73) * 100 + '%');
    cards.forEach(c => c.card.toggleAttribute('data-lit', c === selected));
  }

  function resetScene() {
    confetti.replaceChildren();
    stage.dataset.phase = 'entrada';
    [
      'data-finale',
      'data-closeup',
      'data-rank',
      'data-light',
      'data-titles',
      'data-opening',
      'data-constancy',
    ].forEach(attribute => stage.removeAttribute(attribute));
    opening.hidden = true;
    opening.removeAttribute('data-film');
    film.pause();
    film.hidden = true;
    teaser.hidden = true;
    countdown.hidden = true;
    constancy.hidden = true;
    constancy.removeAttribute('data-shown');
    replayButton.setAttribute('aria-disabled', 'true');
    summaryButton.hidden = true;
    summary.hidden = true;
    frameCamera();
    loadFinalists();
    loadWinners();
    aim(anchors.intro[1]);
    rankTitle.textContent = FINALIST_TITLES[cards.length] ?? '';
    showName(data.seasonName);
    scoreAnnouncement.textContent = '';
  }

  const syncOpeningAudio = () => {
    if (!film.hidden && !film.paused && !film.ended) {
      audio.cue('opening-film', film.currentTime);
    }
  };

  const startFilm = () =>
    film.play().catch(error => {
      if (error.name !== 'AbortError') film.dispatchEvent(new Event('error'));
    });

  function playFilm(signal: AbortSignal) {
    return new Promise<boolean>((resolve, reject) => {
      signal.throwIfAborted();
      if (film.error || film.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        resolve(false);
        return;
      }
      const source = film.querySelector('source') as HTMLSourceElement;
      const startAudio = () => audio.cue('opening-film', film.currentTime);
      const cleanup = () => {
        film.removeEventListener('playing', startAudio);
        film.removeEventListener('ended', finish);
        film.removeEventListener('error', fail);
        source.removeEventListener('error', fail);
        signal.removeEventListener('abort', cancel);
        audio.cue('opening-film-end');
      };
      function finish() {
        cleanup();
        resolve(true);
      }
      function fail() {
        cleanup();
        film.pause();
        resolve(false);
      }
      function cancel() {
        cleanup();
        film.pause();
        reject(signal.reason);
      }

      opening.setAttribute('data-film', '');
      film.hidden = false;
      film.currentTime = 0;
      film.addEventListener('playing', startAudio, { once: true });
      film.addEventListener('ended', finish, { once: true });
      film.addEventListener('error', fail, { once: true });
      source.addEventListener('error', fail, { once: true });
      signal.addEventListener('abort', cancel, { once: true });
      void startFilm();
    });
  }

  async function showOpening(signal: AbortSignal) {
    signal.throwIfAborted();
    const reduced = reducedMotion.matches;
    stage.dataset.opening = 'visible';
    opening.hidden = false;
    const seen = !reduced && (await playFilm(signal));
    if (!seen) {
      opening.removeAttribute('data-film');
      film.hidden = true;
      audio.cue('opening');
      await wait(reduced ? 2100 : 3500, signal);
    }
    if (!reduced) {
      stage.dataset.opening = 'salida';
      await wait(650, signal);
    }
    opening.hidden = true;
    opening.removeAttribute('data-film');
    film.hidden = true;
    stage.removeAttribute('data-opening');
  }

  function showTeaser(rank: number, text: string) {
    stage.dataset.titles = 'teaser';
    (teaser.querySelector('.teaser-label') as HTMLElement).textContent = TITLES[rank];
    (teaser.querySelector('.teaser-title') as HTMLElement).textContent = text;
    teaser.hidden = false;
    teaser.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 440, easing: 'ease-out' }
    );
  }

  /** Cuenta 0 → total respetando la pausa; deja el texto final exacto */
  async function countUp(
    node: HTMLElement,
    total: number,
    duration: number,
    signal: AbortSignal
  ) {
    if (!reducedMotion.matches && total > 0) {
      node.textContent = '0';
      const start = clock.now();
      const tick = () => {
        if (signal.aborted || reducedMotion.matches) return;
        const progress = Math.max(0, Math.min((clock.now() - start) / duration, 1));
        if (progress >= 1) return;
        const text = format.format(Math.floor(total * (1 - (1 - progress) ** 2)));
        if (!paused() && node.textContent !== text) node.textContent = text;
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
      await wait(duration, signal);
    }
    node.textContent = format.format(total);
  }

  async function showPoints(entry: Card, signal: AbortSignal) {
    if (!reducedMotion.matches) await wait(300, signal);
    entry.pointsBlock.setAttribute('data-shown', '');
    if (!reducedMotion.matches && entry.points > 0) {
      audio.cue('score-start', entry.place);
    }
    await countUp(entry.pointsValue, entry.points, 1050, signal);
    scoreAnnouncement.textContent = entry.pointsReadable;
    if (!reducedMotion.matches) {
      audio.cue('score', entry.place);
      entry.pointsBlock.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
        { duration: 240, easing: 'ease-out' }
      );
    }
  }

  async function announce(entry: Card, signal: AbortSignal) {
    const moment = clock.now();
    stage.removeAttribute('data-titles');
    stage.dataset.rank = String(entry.place);
    stage.dataset.phase = 'revelacion';
    teaser.hidden = true;
    countdown.hidden = true;
    entry.card.dataset.place = String(entry.place);
    entry.badge.hidden = false;
    entry.badge.textContent = `${entry.place}.º`;
    rankTitle.textContent = TITLES[entry.place];
    showName(entry.name);
    scoreAnnouncement.textContent = '';
    if (!reducedMotion.matches) {
      nameTitle.animate(
        [
          { opacity: 0.3, transform: 'translateY(7px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 480, easing: 'ease-out' }
      );
    }
    audio.cue('reveal', entry.place);
    await showPoints(entry, signal);
    return moment;
  }

  async function runCountdown(
    rank: number,
    signal: AbortSignal,
    onNumber?: (value: number) => void
  ) {
    stage.dataset.titles = 'countdown';
    (countdown.querySelector('.teaser-label') as HTMLElement).textContent = TITLES[rank];
    teaser.hidden = true;
    countdown.hidden = false;
    for (let value = 3; value >= 1; value--) {
      onNumber?.(value);
      countdownNumber.textContent = String(value);
      countdownNumber.animate(
        [
          { opacity: 0.35, transform: 'scale(.88)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 370, easing: 'ease-out' }
      );
      audio.cue('count', value);
      await wait(780, signal);
    }
  }

  async function revealThird(signal: AbortSignal, third: Card) {
    if (!reducedMotion.matches) {
      stage.dataset.phase = 'cuenta';
      stage.setAttribute('data-light', '');
      const others = cards.filter(c => c !== third);
      await runCountdown(3, signal, value => {
        const lit = others[value % others.length];
        aim(anchors.intro[lit.slot], lit);
      });
      const point = anchors.intro[third.slot];
      aim(point, third);
      frameCamera(point, 1.22);
      await wait(1050, signal);
    }
    return announce(third, signal);
  }

  async function revealSecond(signal: AbortSignal, second: Card) {
    if (!reducedMotion.matches) {
      stage.dataset.phase = 'duelo';
      stage.setAttribute('data-light', '');
      showTeaser(2, 'Quedan dos finalistas');
      frameCamera();
      audio.cue('suspense', 2);
      for (const entry of cards.filter(c => c.place < 3)) {
        aim(anchors.intro[entry.slot], entry);
        await wait(1000, signal);
      }
      const point = anchors.intro[second.slot];
      aim(point, second);
      frameCamera(point, 1.28);
      await wait(1100, signal);
    }
    return announce(second, signal);
  }

  async function revealFirst(signal: AbortSignal, first: Card) {
    if (!reducedMotion.matches) {
      stage.dataset.phase = 'oscuridad';
      stage.removeAttribute('data-light');
      showTeaser(1, 'Y el premio es para…');
      frameCamera();
      audio.cue('suspense', 1);
      const point = anchors.intro[first.slot];
      aim(point);
      await wait(480, signal);
      await runCountdown(1, signal);
      stage.dataset.phase = 'primer-foco';
      stage.setAttribute('data-light', '');
      aim(point, first);
      frameCamera(point, 1.38);
      await wait(750, signal);
      stage.setAttribute('data-closeup', '');
      frameCamera();
      place(first.card, anchors.winner);
    }
    await announce(first, signal);
  }

  function celebrate() {
    if (reducedMotion.matches) return;
    const width = stage.clientWidth;
    const colors = ['#d6aa53', '#ffdfa0', '#fff2cf', '#d7b5a7', '#b9904c', '#b8bbc9'];
    const pieces = document.createDocumentFragment();
    for (let i = 0; i < (width < 450 ? 68 : 118); i++) {
      const piece = el('i', 'confetti-piece');
      const left = i % 2 === 0;
      const set = (key: string, value: string) => piece.style.setProperty(key, value);
      set('--origin', left ? '7%' : '93%');
      set('--dx', (left ? 1 : -1) * (15 + Math.random() * 65) + 'cqw');
      set('--rise', -(26 + Math.random() * 48) + 'cqh');
      set('--foil', colors[i % colors.length]);
      set('--flight', 1400 + Math.random() * 1750 + 'ms');
      set('--delay', Math.random() * 680 + 'ms');
      set('--confetti-size', 2.5 + Math.random() * Math.min(width * 0.008, 8) + 'px');
      pieces.append(piece);
    }
    confetti.replaceChildren(pieces);
  }

  function showPodium(first: Card) {
    stage.dataset.phase = 'cambio';
    stage.removeAttribute('data-closeup');
    stage.setAttribute('data-finale', '');
    cards.forEach(c =>
      place(c.card, { x: anchors.intro[c.slot].x, y: anchors.finale[c.slot].y })
    );
    aim(anchors.finale[1], first);
    frameCamera();
    audio.cue('finale');
    celebrate();
  }

  async function revealConstancy(signal: AbortSignal) {
    const reduced = reducedMotion.matches;
    confetti.replaceChildren();
    stage.removeAttribute('data-finale');
    stage.removeAttribute('data-rank');
    stage.setAttribute('data-constancy', '');
    stage.setAttribute('data-light', '');
    stage.dataset.phase = 'constancia';
    aim({ x: 0.5, y: 0.73 });
    constancy.hidden = false;
    audio.cue('suspense', 2);
    if (!reduced) await wait(900, signal);
    constancy.setAttribute('data-shown', '');
    audio.cue('score-start', 2);
    await countUp(constancyWeeks, data.constancy.bestStreakWeeks, 1200, signal);
    audio.cue('score', 2);
    for (const card of winnerCards) {
      if (!reduced) await wait(600, signal);
      card.setAttribute('data-shown', '');
      audio.cue('count', 1);
    }
    if (!reduced) await wait(500, signal);
    audio.cue('finale');
    celebrate();
  }

  /** Devuelve el escenario a su estado inicial antes de revelar el podio */
  function leaveConstancy() {
    confetti.replaceChildren();
    constancy.hidden = true;
    constancy.removeAttribute('data-shown');
    stage.removeAttribute('data-constancy');
    stage.removeAttribute('data-light');
    stage.dataset.phase = 'entrada';
    aim(anchors.intro[1]);
  }

  function setState(next: State) {
    state = next;
    replayButton.setAttribute('aria-disabled', String(running()));
    pauseButton.setAttribute('aria-disabled', String(!canPause()));
    pauseButton.textContent = paused() ? 'Reanudar' : 'Pausar';
  }

  function applyPause(pause: boolean) {
    if (!canPause() || pause === paused()) return;
    clock.pause(pause);
    if (pause) {
      pausedAnimations = stage
        .getAnimations({ subtree: true })
        .filter(animation => animation.playState === 'running');
      pausedAnimations.forEach(animation => animation.pause());
    } else {
      pausedAnimations.forEach(animation => animation.play());
      pausedAnimations = [];
    }
    let resumed: Promise<void> | undefined;
    if (!film.hidden && !film.ended) {
      if (pause) film.pause();
      else resumed = startFilm();
    }
    const soundState = audio.setPaused(pause);
    if (resumed) void Promise.all([resumed, soundState]).then(syncOpeningAudio);
    if (onPodium()) setState(pause ? 'final-pausa' : 'final');
    else setState(pause ? 'pausa' : 'reproduciendo');
  }

  const waitSince = (ms: number, moment: number, signal: AbortSignal) =>
    wait(Math.max(0, ms - (clock.now() - moment)), signal);

  async function play() {
    controller?.abort();
    applyPause(false);
    controller = new AbortController();
    const { signal } = controller;
    audio.stop();
    resetScene();
    setState('reproduciendo');
    try {
      await imagesReady;
      await showOpening(signal);
      if (data.constancy.winners.length > 0) {
        await revealConstancy(signal);
        await wait(CONSTANCY_HOLD, signal);
        leaveConstancy();
      }
      const byPlace = new Map(cards.map(c => [c.place, c]));
      const first = byPlace.get(1) as Card;
      const second = byPlace.get(2);
      const third = byPlace.get(3);
      await wait(1300, signal);
      frameCamera(anchors.intro[1], 1.045);
      if (third) {
        const moment = await revealThird(signal, third);
        await waitSince(PAUSE_AFTER_THIRD, moment, signal);
      }
      if (second) {
        const moment = await revealSecond(signal, second);
        await waitSince(PAUSE_AFTER_SECOND, moment, signal);
      }
      await revealFirst(signal, first);
      if (!reducedMotion.matches) await wait(920, signal);
      showPodium(first);
      if (!reducedMotion.matches) await wait(760, signal);
      stage.dataset.phase = 'final';
      setState('final');
      summaryButton.hidden = !hasSummary(data);
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }

  const options = { signal: listeners.signal };

  function toggleSummary(open: boolean) {
    if (open) renderSummary($('.summary-body'), data);
    summary.hidden = !open;
    if (open) {
      summary.scrollTop = 0;
      $('[data-summary-close]').focus();
    } else {
      summaryButton.focus();
    }
  }
  summaryButton.addEventListener('click', () => toggleSummary(true), options);
  $('[data-summary-close]').addEventListener(
    'click',
    () => toggleSummary(false),
    options
  );

  replayButton.addEventListener(
    'click',
    () => {
      if (replayButton.getAttribute('aria-disabled') === 'false') void play();
    },
    options
  );
  pauseButton.addEventListener('click', () => applyPause(!paused()), options);
  $('[data-close]').addEventListener('click', onClose, options);

  let togglingSound = false;
  async function setSound(requested: boolean) {
    if (togglingSound) return;
    togglingSound = true;
    const on = await audio.setEnabled(requested);
    soundButton.setAttribute('aria-pressed', String(on));
    soundButton.textContent = on ? 'Silenciar' : 'Activar sonido';
    if (on) syncOpeningAudio();
    togglingSound = false;
  }
  soundButton.addEventListener(
    'click',
    () => void setSound(soundButton.getAttribute('aria-pressed') === 'false'),
    options
  );

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Sin API de pantalla completa (p. ej. iOS): el overlay ya ocupa la ventana
      fullscreenButton.hidden = true;
    }
  }
  if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener('click', toggleFullscreen, options);
  const syncFullscreen = () => {
    const full = !!document.fullscreenElement;
    root.toggleAttribute('data-fullscreen', full);
    fullscreenButton.textContent = full
      ? 'Salir de pantalla completa'
      : 'Pantalla completa';
  };
  document.addEventListener('fullscreenchange', syncFullscreen, options);
  syncFullscreen();

  // En captura y con preventDefault: el panel de admin que está debajo no debe
  // cerrarse con el mismo Esc.
  window.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!summary.hidden) toggleSummary(false);
        else onClose();
        return;
      }
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if ((event.target as Element).closest?.('button, input, textarea, select')) return;
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.code === 'Space' && canPause()) {
        event.preventDefault();
        applyPause(!paused());
      }
    },
    { capture: true, signal: listeners.signal }
  );

  // Con sonido: esperar (poco) a que cargue la música para que la intro suene
  if (launch) {
    const timeout = new Promise(resolve => window.setTimeout(resolve, 1500));
    void Promise.race([setSound(true), timeout]).then(() => {
      if (!listeners.signal.aborted) void play();
    });
  } else {
    void play();
  }

  return {
    destroy() {
      listeners.abort();
      controller?.abort();
      film.pause();
      audio.destroy();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      root.replaceChildren();
    },
  };
}
