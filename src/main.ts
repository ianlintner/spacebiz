import "./site.css";
import * as Phaser from "phaser";
import { createGameConfig, calculateGameSize } from "./game/config.ts";
import { updateLayout } from "./ui/Layout.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { MainMenuScene } from "./scenes/MainMenuScene.ts";
import { GalaxySetupScene } from "./scenes/GalaxySetupScene.ts";
import { GameHUDScene } from "./scenes/GameHUDScene.ts";
import { GalaxyMapScene } from "./scenes/GalaxyMapScene.ts";
import { SystemMapScene } from "./scenes/SystemMapScene.ts";
import { PlanetDetailScene } from "./scenes/PlanetDetailScene.ts";
import { FleetScene } from "./scenes/FleetScene.ts";
import { RoutesScene } from "./scenes/RoutesScene.ts";
import { FinanceScene } from "./scenes/FinanceScene.ts";
import { MarketScene } from "./scenes/MarketScene.ts";
import { SimPlaybackScene } from "./scenes/SimPlaybackScene.ts";
import { TurnReportScene } from "./scenes/TurnReportScene.ts";
import { DilemmaScene } from "./scenes/DilemmaScene.ts";
import { GameOverScene } from "./scenes/GameOverScene.ts";
import { ContractsScene } from "./scenes/ContractsScene.ts";
import { TechTreeScene } from "./scenes/TechTreeScene.ts";
import { SandboxSetupScene } from "./scenes/SandboxSetupScene.ts";
import { AISandboxScene } from "./scenes/AISandboxScene.ts";
import { SimSummaryScene } from "./scenes/SimSummaryScene.ts";
import { EmpireScene } from "./scenes/EmpireScene.ts";
import { CompetitionScene } from "./scenes/CompetitionScene.ts";
import { StationBuilderScene } from "./scenes/StationBuilderScene.ts";
import {
  CARGO_CHEAT_SHEET,
  DISCLOSURE_CARDS,
  FAQ_ITEMS,
  FEATURE_CARDS,
  HELP_TOPICS,
  HERO_METRICS,
  MANUAL_SECTIONS,
  PLANET_CHEAT_SHEET,
  STARTER_FLEET_CARDS,
} from "./siteContent.ts";
import { CEO_PORTRAITS } from "./data/portraits.ts";
import { EMPIRE_LEADER_PORTRAITS } from "./data/empireLeaderPortraits.ts";
import { SHIP_TEMPLATES } from "./data/constants.ts";

interface NavItem {
  id: string;
  label: string;
}

interface BuildInfo {
  buildNumber: string;
  commitSha: string;
  shortCommit: string;
  githubUrl: string;
}

declare const __SFT_BUILD_INFO__: BuildInfo;

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "command-deck", label: "Command Deck" },
  { id: "manual", label: "Manual" },
  { id: "wiki", label: "Wiki" },
  { id: "portrait-qa", label: "Portrait QA" },
  { id: "help", label: "Help" },
  { id: "ai-disclosure", label: "AI & Credits" },
];

let activeGame: Phaser.Game | null = null;
const BUILD_INFO = __SFT_BUILD_INFO__;

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderBuildLink(className: string): string {
  const label = `Build ${BUILD_INFO.buildNumber} / ${BUILD_INFO.shortCommit}`;
  const safeLabel = escapeHtml(label);

  if (!BUILD_INFO.githubUrl) {
    return `<span class="${className}">${safeLabel}</span>`;
  }

  return `<a class="${className}" href="${escapeHtml(BUILD_INFO.githubUrl)}" target="_blank" rel="noreferrer noopener">${safeLabel}</a>`;
}

function renderNavLinks(): string {
  return NAV_ITEMS.map(
    ({ id, label }) =>
      `<li><a class="nav-link" href="#${id}" data-section-link="${id}">${label}</a></li>`,
  ).join("");
}

function renderFeatureCards(): string {
  return FEATURE_CARDS.map(
    (card) => `
      <article class="card">
        <span>${card.eyebrow}</span>
        <h3>${card.title}</h3>
        <p>${card.body}</p>
      </article>
    `,
  ).join("");
}

function renderHeroMetrics(): string {
  return HERO_METRICS.map(
    (metric) => `
      <article class="metric-card">
        <span>${metric.label}</span>
        <strong>${metric.value}</strong>
        <p>${metric.detail}</p>
      </article>
    `,
  ).join("");
}

function renderTimelineItems(): string {
  return MANUAL_SECTIONS.map(
    (section) => `
      <article class="timeline-item">
        <h3>${section.title}</h3>
        <p>${section.summary}</p>
      </article>
    `,
  ).join("");
}

function renderManualAccordions(): string {
  return MANUAL_SECTIONS.map(
    (section, index) => `
      <details ${index === 0 ? "open" : ""} data-accordion-group="manual">
        <summary>${section.title}</summary>
        <div class="details-body">
          <p>${section.summary}</p>
          <ul>
            ${section.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </div>
      </details>
    `,
  ).join("");
}

function renderGuideCards(cards: typeof PLANET_CHEAT_SHEET): string {
  return cards
    .map(
      (card) => `
        <article class="cheat-card">
          <span>${card.caption}</span>
          <strong>${card.title}</strong>
          <ul>
            ${card.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function renderHelpPanels(): string {
  return HELP_TOPICS.map(
    (topic) => `
      <article class="help-panel">
        <h3>${topic.title}</h3>
        <p>${topic.summary}</p>
        <ul>
          ${topic.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
        </ul>
      </article>
    `,
  ).join("");
}

function renderFaqItems(): string {
  return FAQ_ITEMS.map(
    (item) => `
      <article class="faq-item">
        <h3>${item.question}</h3>
        <p>${item.answer}</p>
      </article>
    `,
  ).join("");
}

function renderDisclosureCards(): string {
  return DISCLOSURE_CARDS.map(
    (card) => `
      <article class="disclosure-card">
        <span>Production Notes</span>
        <h3>${card.title}</h3>
        <p>${card.summary}</p>
        <ul>
          ${card.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
        </ul>
      </article>
    `,
  ).join("");
}

function renderWikiLinks(): string {
  return [
    {
      title: "Wiki Hub",
      href: "/wiki/index.html",
      caption: "Overview and navigation for all reference sections.",
    },
    {
      title: `CEO Directory (${CEO_PORTRAITS.length})`,
      href: "/wiki/ceos.html",
      caption: "Full company roster with portrait cards and metadata.",
    },
    {
      title: `Leader Directory (${EMPIRE_LEADER_PORTRAITS.length})`,
      href: "/wiki/leaders.html",
      caption: "Empire leadership roster with archetype and species labels.",
    },
    {
      title: `Ship Directory (${Object.keys(SHIP_TEMPLATES).length})`,
      href: "/wiki/ships.html",
      caption:
        "Ship classes, capacities, performance, and operating cost baselines.",
    },
  ]
    .map(
      (link) => `
        <a class="qa-link" href="${link.href}" target="_blank" rel="noreferrer noopener">
          <strong>${link.title}</strong>
          <span>${link.caption}</span>
        </a>
      `,
    )
    .join("");
}

function renderQaLinks(): string {
  return [
    {
      title: "Compact CEO Portrait Gallery",
      href: "/qa/spacebiz-ceo-gallery-compact.html",
      caption: "100 CEO portraits in a scan-friendly grid for visual QA.",
    },
    {
      title: "Compact Leader Portrait Gallery",
      href: "/qa/spacebiz-leader-gallery-compact.html",
      caption: "20 empire leader portraits in compact card format.",
    },
    {
      title: "Compact Planet Portrait Gallery",
      href: "/qa/spacebiz-planet-gallery-compact.html",
      caption: "Planet portrait set by biome type for art consistency checks.",
    },
    {
      title: "Ship Reference Sheet",
      href: "/qa/spacebiz-ship-reference.html",
      caption:
        "Ship class and stat reference for balancing and regression review.",
    },
  ]
    .map(
      (link) => `
        <a class="qa-link" href="${link.href}" target="_blank" rel="noreferrer noopener">
          <strong>${link.title}</strong>
          <span>${link.caption}</span>
        </a>
      `,
    )
    .join("");
}

function renderSite(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App root #app was not found.");
  }

  app.innerHTML = `
    <div class="site-shell">
      <header class="site-header" data-site-header>
        <a class="brand" href="#overview" aria-label="Star Freight Tycoon home">
          <span class="brand__mark">SF</span>
          <span class="brand__text">
            <span class="brand__title">Star Freight Tycoon</span>
            <span class="brand__subtitle">Trade lanes, quarterly P&Ls, and the slow art of empire.</span>
          </span>
        </a>

        <nav class="site-nav" aria-label="Site navigation">
          <ul class="nav-list">
            ${renderNavLinks()}
          </ul>
        </nav>

        <button
          class="nav-toggle"
          type="button"
          aria-expanded="false"
          aria-label="Toggle site menu"
          data-nav-toggle
        >☰</button>

        <div class="header-status" aria-live="polite">
          <span class="status-dot"></span>
          <span id="section-indicator">Overview</span>
        </div>
      </header>

      <main class="site-main">
        <section id="overview" class="section hero hero--full-bleed">
          <div class="hero-shell">
            <div class="hero-stage hero-stage--full">
              <div class="game-frame game-frame--hero" data-game-frame>
                <div class="game-frame__hud">
                  <div class="game-frame__cluster">
                    <span class="signal-light signal-light--teal"></span>
                    <span class="signal-light signal-light--blue"></span>
                    <span class="signal-light signal-light--amber"></span>
                    <span>Bridge View</span>
                  </div>
                  <div class="game-frame__status">
                    ${renderBuildLink("build-chip")}
                    <span class="launch-state">Ready for Launch</span>
                    <button class="game-frame__control" type="button" data-fullscreen-toggle aria-pressed="false">Full Screen</button>
                  </div>
                </div>

                <div class="game-frame__screen game-frame__screen--hero">
                  <div class="viewport viewport--hero">
                    <div id="game-container" aria-label="Playable Star Freight Tycoon game viewport"></div>
                  </div>
                </div>
              </div>

              <div class="frame-caption frame-caption--hero">
                <p>
                  Captain on deck. Charters drawn, hulls fueled, market open.
                </p>
                <span class="frame-caption__meta">Phaser 4 • TypeScript • Vite</span>
              </div>
            </div>

            <div class="hero-copy-wrap panel-surface">
              <div class="hero-copy hero-copy--full">
                <span class="kicker">Cleared for Launch</span>
                <h1>Run a freight empire across a procedural galaxy.</h1>
                <p>
                  Buy low, sell high, expand the fleet, weather the events. Twenty quarters to build something that lasts.
                </p>

                <div class="hero-actions">
                  <a class="button-link" href="#manual">Read the manual</a>
                  <a class="text-link" href="#help">Need quick-start help?</a>
                  <a class="text-link" href="#ai-disclosure">AI disclosure</a>
                </div>

                <div class="hero-badges">
                  <article class="badge">
                    <span>Loop</span>
                    <strong>Plan → Simulate → Review</strong>
                  </article>
                  <article class="badge">
                    <span>Systems</span>
                    <strong>Routes, fleets, contracts, dilemmas, AI rivals</strong>
                  </article>
                  <article class="badge">
                    <span>Vibes</span>
                    <strong>Retro command-deck — Aerobiz meets MOO2</strong>
                  </article>
                </div>

                <div class="hero-metrics">
                  <h2 class="hero-metrics__title">Mission briefing</h2>
                  <div class="metrics-grid">
                    ${renderHeroMetrics()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="command-deck" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Command Deck</span>
              <h2>Pick a heading.</h2>
            </div>
          </div>

          <div class="command-layout">
            <div class="card-grid">
              ${renderFeatureCards()}
            </div>

            <div class="copy-block">
              <h3 class="panel-title">Quick warps</h3>
              <div class="quick-links">
                <a class="quick-link" href="#overview">
                  <strong>Back to the bridge</strong>
                  <span>Hands on the controls.</span>
                </a>
                <a class="quick-link" href="#manual">
                  <strong>Operations manual</strong>
                  <span>Opening moves, cargo logic, expansion timing.</span>
                </a>
                <a class="quick-link" href="#help">
                  <strong>Strategy panels</strong>
                  <span>Mid-run answers when something's off.</span>
                </a>
                <a class="quick-link" href="#ai-disclosure">
                  <strong>Production notes</strong>
                  <span>Receipts and credits.</span>
                </a>
                <a class="quick-link" href="#wiki">
                  <strong>Codex</strong>
                  <span>CEOs, empire leaders, every ship class.</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="manual" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Operations Manual</span>
              <h2>Six chapters between you and a profitable run.</h2>
            </div>
          </div>

          <div class="manual-layout">
            <div class="manual-timeline">
              ${renderTimelineItems()}
            </div>

            <div class="accordion-group">
              ${renderManualAccordions()}
            </div>
          </div>

          <div class="cheat-grid">
            ${renderGuideCards(STARTER_FLEET_CARDS)}
          </div>

          <div class="cheat-grid">
            ${renderGuideCards(PLANET_CHEAT_SHEET)}
          </div>

          <div class="cheat-grid">
            ${renderGuideCards(CARGO_CHEAT_SHEET)}
          </div>
        </section>

        <section id="wiki" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Codex</span>
              <h2>CEOs, empire leaders, every ship in the catalog.</h2>
            </div>
          </div>

          <div class="qa-grid">
            ${renderWikiLinks()}
          </div>
        </section>

        <section id="portrait-qa" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Portrait QA</span>
              <h2>Compact galleries for fast art review.</h2>
            </div>
          </div>

          <div class="qa-grid">
            ${renderQaLinks()}
          </div>
        </section>

        <section id="help" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Strategy Tips</span>
              <h2>Fast answers for the decisions that actually swing a run.</h2>
            </div>
          </div>

          <div class="help-layout">
            <div class="card-grid">
              ${renderHelpPanels()}
            </div>

            <div class="help-panel">
              <h3>Fast answers</h3>
              <div class="faq-list">
                ${renderFaqItems()}
              </div>
            </div>
          </div>
        </section>

        <section id="ai-disclosure" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Production Notes</span>
              <h2>Receipts, credits, and an honest map of who made what.</h2>
            </div>
          </div>

          <div class="disclosure-grid">
            ${renderDisclosureCards()}
          </div>

          <div class="footer-layout" style="margin-top: 1rem;">
            <div class="footer-panel">
              <h3>Quick links</h3>
              <div class="footer-links">
                <a class="quick-link" href="#overview">
                  <strong>Bridge</strong>
                  <span>Take the controls.</span>
                </a>
                <a class="quick-link" href="#manual">
                  <strong>Manual</strong>
                  <span>Loop, hulls, cheat sheets.</span>
                </a>
                <a class="quick-link" href="#portrait-qa">
                  <strong>Portrait QA</strong>
                  <span>Compact art galleries.</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p class="footer-note">
          <strong>Star Freight Tycoon</strong> <span id="site-year"></span> · ${renderBuildLink("footer-build-link")}
        </p>
      </footer>
    </div>
  `;
}

function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupNavigation(): void {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("a[href^='#']"),
  );

  toggle?.addEventListener("click", () => {
    const isOpen = header?.classList.toggle("is-open") ?? false;
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) {
        return;
      }

      const sectionId = href.slice(1);
      event.preventDefault();
      scrollToSection(sectionId);
      header?.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
}

function setupSectionObserver(): void {
  const sectionIndicator =
    document.querySelector<HTMLElement>("#section-indicator");
  const sectionLabels = new Map(NAV_ITEMS.map((item) => [item.id, item.label]));
  const navLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-section-link]"),
  );
  const sections = NAV_ITEMS.map((item) =>
    document.getElementById(item.id),
  ).filter((section): section is HTMLElement => section instanceof HTMLElement);

  const setActiveSection = (id: string): void => {
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.sectionLink === id);
    });

    if (sectionIndicator) {
      sectionIndicator.textContent = sectionLabels.get(id) ?? "Overview";
    }
  };

  if (sections.length === 0) {
    return;
  }

  setActiveSection(sections[0].id);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      const candidate = visible[0];
      if (candidate?.target instanceof HTMLElement) {
        setActiveSection(candidate.target.id);
      }
    },
    {
      threshold: [0.2, 0.35, 0.6],
      rootMargin: "-20% 0px -55% 0px",
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function setupAccordions(): void {
  const detailsElements = Array.from(
    document.querySelectorAll<HTMLDetailsElement>(
      "details[data-accordion-group]",
    ),
  );

  detailsElements.forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) {
        return;
      }

      const group = details.dataset.accordionGroup;
      detailsElements.forEach((other) => {
        if (other !== details && other.dataset.accordionGroup === group) {
          other.open = false;
        }
      });
    });
  });
}

function updateFooterYear(): void {
  const yearTarget = document.querySelector<HTMLElement>("#site-year");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }
}

// Cache the last applied dimensions so we can no-op when the resize event
// fires for the same size (common during scroll-bar toggling reflows).
let lastAppliedWidth = 0;
let lastAppliedHeight = 0;

function resizeGameToViewport(): void {
  if (!activeGame) {
    return;
  }

  // Prefer the canvas parent's bounding box. Reading window.innerWidth/Height
  // includes scrollbar width on some browsers, which flips when the canvas
  // resize itself toggles a page scrollbar — that's the feedback loop we
  // want to break. Fall back to the window when the parent isn't laid out yet.
  const parent = document.getElementById("game-container");
  const parentRect = parent?.getBoundingClientRect();
  const parentW = parentRect && parentRect.width > 0 ? parentRect.width : 0;
  const parentH = parentRect && parentRect.height > 0 ? parentRect.height : 0;
  const sourceW = parentW > 0 ? parentW : window.innerWidth || 1280;
  const sourceH = parentH > 0 ? parentH : window.innerHeight || 720;

  const size = calculateGameSize(sourceW, sourceH);

  // Skip the round-trip if the resulting virtual size hasn't changed by at
  // least 1px in either axis. Phaser's scale.resize triggers a layout pass
  // and emits its own internal events; calling it for a no-op size starts the
  // exact thrash we're trying to avoid.
  if (
    size.width === lastAppliedWidth &&
    size.height === lastAppliedHeight
  ) {
    return;
  }
  lastAppliedWidth = size.width;
  lastAppliedHeight = size.height;

  updateLayout(size.width, size.height);
  // scale.resize internally refreshes the layout — calling scale.refresh()
  // afterwards is redundant and triggers an extra layout pass.
  activeGame.scale.resize(size.width, size.height);
}

function setupFullscreenControl(): void {
  const frame = document.querySelector<HTMLElement>("[data-game-frame]");
  const toggle = document.querySelector<HTMLButtonElement>(
    "[data-fullscreen-toggle]",
  );

  if (!frame || !toggle) {
    return;
  }

  if (!document.fullscreenEnabled || !frame.requestFullscreen) {
    toggle.hidden = true;
    return;
  }

  const syncButton = (): void => {
    const isFullscreen = document.fullscreenElement === frame;
    toggle.textContent = isFullscreen ? "Exit Full Screen" : "Full Screen";
    toggle.setAttribute("aria-pressed", String(isFullscreen));
    frame.classList.toggle("is-browser-fullscreen", isFullscreen);
    window.requestAnimationFrame(resizeGameToViewport);
  };

  toggle.addEventListener("click", () => {
    const request = document.fullscreenElement === frame
      ? document.exitFullscreen()
      : frame.requestFullscreen({ navigationUI: "hide" });

    request.catch((error: unknown) => {
      console.warn("Fullscreen request failed", error);
    });
  });

  document.addEventListener("fullscreenchange", syncButton);
  syncButton();
}

function mountGame(): void {
  if (activeGame) {
    return;
  }

  const config = createGameConfig([
    BootScene,
    MainMenuScene,
    GalaxySetupScene,
    GameHUDScene,
    GalaxyMapScene,
    SystemMapScene,
    PlanetDetailScene,
    FleetScene,
    RoutesScene,
    ContractsScene,
    TechTreeScene,
    FinanceScene,
    MarketScene,
    SimPlaybackScene,
    TurnReportScene,
    DilemmaScene,
    GameOverScene,
    SandboxSetupScene,
    AISandboxScene,
    SimSummaryScene,
    EmpireScene,
    CompetitionScene,
    StationBuilderScene,
  ]);

  activeGame = new Phaser.Game(config);
  window.requestAnimationFrame(() => {
    activeGame?.scale.refresh();
  });

  // QA testing façade (`window.__sft`).
  //
  // DEV builds always install it. Prod builds install only when `?debug=1` is
  // in the URL — keeps the testing chunk out of normal prod page loads while
  // still shipping it in `dist/` for ops/QA opt-in use.
  const qaOptIn =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("debug") === "1";
  const sftMode: "dev" | "debug" | null = import.meta.env.DEV
    ? "dev"
    : qaOptIn
      ? "debug"
      : null;
  if (sftMode && activeGame) {
    const game = activeGame;
    void import("./testing/index.ts").then((m) =>
      m.installTestAPI(game, sftMode),
    );
  }

  // Track resizes via a ResizeObserver on the canvas parent. This is more
  // accurate than window.resize because the game cares about its own
  // container's box, not the window — and it avoids the scrollbar-flicker
  // feedback loop where a window.resize fires every time the canvas resize
  // itself toggles a page scrollbar.
  let pendingFrame = 0;
  const scheduleResize = (): void => {
    if (pendingFrame) return;
    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = 0;
      resizeGameToViewport();
    });
  };

  const parent = document.getElementById("game-container");
  if (parent && typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(parent);
  }
  // Keep a window.resize fallback for orientation flips and browsers that
  // don't fire the ResizeObserver on viewport-driven CSS changes.
  window.addEventListener("resize", scheduleResize);
}

renderSite();
setupNavigation();
setupSectionObserver();
setupAccordions();
updateFooterYear();
mountGame();
setupFullscreenControl();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    activeGame?.destroy(true);
    activeGame = null;
    lastAppliedWidth = 0;
    lastAppliedHeight = 0;
  });
}
