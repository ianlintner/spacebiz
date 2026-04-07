import "./site.css";
import Phaser from "phaser";
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
import { GameOverScene } from "./scenes/GameOverScene.ts";
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

interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "command-deck", label: "Command Deck" },
  { id: "manual", label: "Manual" },
  { id: "help", label: "Help" },
  { id: "ai-disclosure", label: "AI & Credits" },
];

let activeGame: Phaser.Game | null = null;

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
            <span class="brand__subtitle">Trade lanes. Quarter reports. Space capitalism.</span>
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
              <div class="game-frame game-frame--hero">
                <div class="game-frame__hud">
                  <div class="game-frame__cluster">
                    <span class="signal-light signal-light--teal"></span>
                    <span class="signal-light signal-light--blue"></span>
                    <span class="signal-light signal-light--amber"></span>
                    <span>Bridge View</span>
                  </div>
                  <div class="game-frame__status">
                    <span>Interactive Build</span>
                    <span>Ready for Launch</span>
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
                  The game now owns the top of the page as a true hero banner, while the briefings, manual, and disclosures dock neatly underneath it.
                </p>
                <span class="frame-caption__meta">Phaser 3 • TypeScript • Vite</span>
              </div>
            </div>

            <div class="hero-copy-wrap panel-surface">
              <div class="hero-copy hero-copy--full">
                <span class="kicker">Playable Home Screen</span>
                <h1>Run a freight empire from a polished orbital command deck.</h1>
                <p>
                  This one-page site turns the game itself into a full-width hero experience, then layers in a manual, fast help, and up-front AI asset disclosure without ever feeling like you left the bridge.
                </p>

                <div class="hero-actions">
                  <a class="button-link" href="#manual">Read the manual</a>
                  <a class="text-link" href="#help">Need quick-start help?</a>
                  <a class="text-link" href="#ai-disclosure">AI disclosure</a>
                </div>

                <div class="hero-badges">
                  <article class="badge">
                    <span>Game Loop</span>
                    <strong>Plan → Simulate → Review</strong>
                  </article>
                  <article class="badge">
                    <span>Systems</span>
                    <strong>Economy, routes, fleets, events</strong>
                  </article>
                  <article class="badge">
                    <span>Style</span>
                    <strong>Retro neon with cinematic framing</strong>
                  </article>
                </div>

                <div class="hero-metrics">
                  <h2 class="hero-metrics__title">Current mission profile</h2>
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
              <span class="kicker">Site Menu</span>
              <h2>Simple navigation, zero confusion, maximum vibes.</h2>
            </div>
            <p>
              The interaction model is intentionally friendly: sticky menu, smooth section jumps, live section highlighting, and expandable briefings instead of dense walls of text.
            </p>
          </div>

          <div class="command-layout">
            <div class="card-grid">
              ${renderFeatureCards()}
            </div>

            <div class="copy-block">
              <h3 class="panel-title">Command shortcuts</h3>
              <p>
                Treat the navigation like a flight console: jump to the section you need, skim the briefing, then get right back to the game.
              </p>
              <div class="quick-links">
                <a class="quick-link" href="#overview">
                  <strong>Return to bridge</strong>
                  <span>Snap back to the framed playable build.</span>
                </a>
                <a class="quick-link" href="#manual">
                  <strong>Operations manual</strong>
                  <span>See the campaign loop, starter loadout, planets, and cargo logic.</span>
                </a>
                <a class="quick-link" href="#help">
                  <strong>Quick help</strong>
                  <span>Need tactical advice? Open the short-form strategy panels and FAQs.</span>
                </a>
                <a class="quick-link" href="#ai-disclosure">
                  <strong>Production notes</strong>
                  <span>Review the disclosure for AI-assisted music and visual material usage.</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="manual" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Gameplay Manual</span>
              <h2>Everything you need to play without opening a second tab.</h2>
            </div>
            <p>
              Start here if you want the full loop: how a run begins, what makes a route profitable, when to expand, and how to avoid a dramatic debt-fueled spiral.
            </p>
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

        <section id="help" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">Help & Strategy</span>
              <h2>Short answers for the moments when the galaxy punches first.</h2>
            </div>
            <p>
              These panels are tuned for quick rescue reads: what to do in the early game, when to buy ships, and how to recover from a rough quarter without panic-building an empire-shaped crater.
            </p>
          </div>

          <div class="help-layout">
            <div class="card-grid">
              ${renderHelpPanels()}
            </div>

            <div class="help-panel">
              <h3>Fast answers</h3>
              <p>
                If you are already mid-run, this FAQ is the shortest route back to confidence.
              </p>
              <div class="faq-list">
                ${renderFaqItems()}
              </div>
            </div>
          </div>
        </section>

        <section id="ai-disclosure" class="section panel-surface">
          <div class="section-head">
            <div>
              <span class="kicker">AI Disclosure</span>
              <h2>Clear credits and production notes, right where players can find them.</h2>
            </div>
            <p>
              The site explicitly discloses AI-assisted music and visual materials while keeping authorship, editing, and implementation responsibility plainly human and easy to understand.
            </p>
          </div>

          <div class="disclosure-grid">
            ${renderDisclosureCards()}
          </div>

          <div class="footer-layout" style="margin-top: 1rem;">
            <div class="footer-panel">
              <h3>Why this structure works</h3>
              <p>
                The home page stays playable, the manual is browseable, the help is quick to scan, and the disclosure is impossible to miss. That combination makes the site feel curated instead of merely assembled.
              </p>
            </div>
            <div class="footer-panel">
              <h3>Quick links</h3>
              <div class="footer-links">
                <a class="quick-link" href="#overview">
                  <strong>Play view</strong>
                  <span>Back to the framed build.</span>
                </a>
                <a class="quick-link" href="#manual">
                  <strong>Manual</strong>
                  <span>Full loop and cheat sheets.</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p class="footer-note">
          <strong>Star Freight Tycoon</strong> — playable web prototype, strategy reference, and transparent production notes in one streamlined SPA shell. <span id="site-year"></span>
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
    FinanceScene,
    MarketScene,
    SimPlaybackScene,
    TurnReportScene,
    GameOverScene,
  ]);

  activeGame = new Phaser.Game(config);
  window.requestAnimationFrame(() => {
    activeGame?.scale.refresh();
  });

  // Recalculate virtual resolution on significant viewport changes (orientation flip)
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!activeGame) return;
      const size = calculateGameSize();
      updateLayout(size.width, size.height);
      activeGame.scale.resize(size.width, size.height);
      activeGame.scale.refresh();
    }, 250);
  });
}

renderSite();
setupNavigation();
setupSectionObserver();
setupAccordions();
updateFooterYear();
mountGame();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    activeGame?.destroy(true);
    activeGame = null;
  });
}
