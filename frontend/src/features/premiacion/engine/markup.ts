// Estructura fija de la cinemática. Los datos de los jóvenes se escriben
// siempre con textContent / src, nunca dentro de este HTML.
export const buildMarkup = (assets: {
  stage: string;
  podium: string;
  winner: string;
  logo: string;
  film: string;
}) => `
<section class="screening" aria-label="Premiación de la temporada">
  <div class="cinema-stage" data-phase="entrada">
    <div class="world">
      <div class="set-art" aria-hidden="true">
        <img class="plate plate-intro" src="${assets.stage}" alt="" draggable="false">
        <img class="plate plate-finale" src="${assets.podium}" alt="" draggable="false">
        <img class="plate plate-winner" src="${assets.winner}" alt="" draggable="false">
      </div>
      <div class="stage-lights" aria-hidden="true">
        <div class="light-spill"></div>
        <div class="light-beam"></div>
      </div>
      <div class="podium-gleams" aria-hidden="true">
        <div data-podium-place="2"></div>
        <div data-podium-place="1"></div>
        <div data-podium-place="3"></div>
      </div>
      <div class="podium-numbers" aria-hidden="true">
        <span>2.º</span><span>1.º</span><span>3.º</span>
      </div>
      <ul class="finalists" aria-label="Finalistas"></ul>
    </div>
    <div class="stage-grade" aria-hidden="true"></div>
    <div class="confetti" aria-hidden="true"></div>
    <div class="stage-titles">
      <div class="result" role="status" aria-live="polite" aria-atomic="true">
        <p class="rank-title"></p>
        <h2 class="name-title"></h2>
        <p class="score-announcement screen-reader-text"></p>
      </div>
      <div class="teaser" aria-hidden="true" hidden>
        <p class="teaser-label"></p>
        <p class="teaser-title"></p>
      </div>
      <div class="countdown" aria-hidden="true" hidden>
        <p class="teaser-label"></p>
        <div class="countdown-ring"><span class="countdown-number"></span></div>
      </div>
    </div>
    <div class="constancy" hidden>
      <p class="constancy-label">Bonus constancia</p>
      <h2 class="constancy-title">Mejor racha de la temporada</h2>
      <p class="constancy-count"><span class="constancy-weeks">0</span> <span class="constancy-unit"></span></p>
      <ul class="constancy-winners" aria-label="Ganadores del bonus constancia"></ul>
    </div>
    <button class="summary-open" type="button" data-summary-open hidden>Ver resumen</button>
    <div class="opening" hidden>
      <video class="opening-film" muted playsinline preload="auto" hidden aria-hidden="true">
        <source src="${assets.film}" type="video/mp4">
      </video>
      <div class="opening-sweep" aria-hidden="true"></div>
      <div class="opening-lockup">
        <div class="opening-seal">
          <img class="opening-logo" src="${assets.logo}" alt="Jóvenes Modelia" draggable="false">
        </div>
        <p class="opening-title">Noche de premiación</p>
      </div>
    </div>
  </div>
  <div class="player">
    <div class="player-main">
      <button class="player-replay" type="button" data-replay aria-disabled="true">
        <span class="button-symbol" aria-hidden="true">↻</span> Repetir
      </button>
      <button type="button" data-pause aria-disabled="true">Pausar</button>
    </div>
    <div class="player-aside">
      <button type="button" data-sound aria-pressed="false">Activar sonido</button>
      <button type="button" data-fullscreen>Pantalla completa</button>
      <button type="button" data-close>Cerrar</button>
    </div>
  </div>
</section>
<div class="summary" role="dialog" aria-label="Resumen de la temporada" hidden>
  <div class="summary-inner">
    <button class="summary-close" type="button" data-summary-close>Volver</button>
    <div class="summary-body"></div>
  </div>
</div>`;
