import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { ContractStatus, ContractType, ShipClass } from "../data/types.ts";
import type {
  Contract,
  ContractType as ContractTypeValue,
} from "../data/types.ts";
import {
  getTheme,
  colorToString,
  Button,
  DataTable,
  ScrollFrame,
  Modal,
  Panel,
  TabGroup,
  PortraitPanel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  getCargoLabel,
  getCargoIconKey,
  getCargoColor,
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
  DEPTH_MODAL,
} from "../ui/index.ts";
import {
  acceptContract,
  abandonContract,
} from "../game/contracts/ContractManager.ts";
import {
  getAvailableRouteSlots,
  getUsedRouteSlots,
} from "../game/routes/RouteManager.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import { buyShip } from "../game/fleet/FleetManager.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}§${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}§${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}§${(abs / 1_000).toFixed(1)}K`;
  return `${sign}§${Math.round(abs)}`;
}

const CONTRACT_TYPE_LABELS: Record<ContractTypeValue, string> = {
  [ContractType.EmpireUnlock]: "\uD83C\uDF10 Empire Unlock",
  [ContractType.PassengerFerry]: "\uD83D\uDE8C Passenger Ferry",
  [ContractType.EmergencySupply]: "\uD83D\uDEA8 Emergency Supply",
  [ContractType.TradeAlliance]: "\uD83E\uDD1D Trade Alliance",
  [ContractType.ResearchCourier]: "\uD83D\uDD2C Research Courier",
};

function contractTypeLabel(type: ContractTypeValue): string {
  return CONTRACT_TYPE_LABELS[type] ?? type;
}

function contractStatusLabel(c: Contract): string {
  if (c.status === ContractStatus.Active) {
    if (c.linkedRouteId) {
      const state = gameStore.getState();
      const route = state.activeRoutes.find((r) => r.id === c.linkedRouteId);
      if (route && route.assignedShipIds.length === 0) {
        return "\u26A0 No Ship";
      }
    }
    return "\u2713 On Track";
  }
  return c.status;
}

function rewardSummary(c: Contract): string {
  const parts: string[] = [];
  if (c.rewardCash > 0) parts.push(formatCompact(c.rewardCash));
  if (c.rewardReputation > 0) parts.push(`+${c.rewardReputation} rep`);
  if (c.rewardResearchPoints > 0) parts.push(`+${c.rewardResearchPoints} RP`);
  if (c.type === ContractType.EmpireUnlock) parts.push("Empire Access");
  if (c.rewardTariffReduction)
    parts.push(
      `-${(c.rewardTariffReduction.reduction * 100).toFixed(0)}% tariff`,
    );
  if (c.rewardSlotBonus && c.rewardSlotBonus.amount > 0) {
    const scopeLabel =
      c.rewardSlotBonus.scope === "system"
        ? "Sys"
        : c.rewardSlotBonus.scope === "empire"
          ? "Emp"
          : "Gal";
    parts.push(`+${c.rewardSlotBonus.amount} ${scopeLabel} slot`);
  }
  return parts.join(" \u2022 ") || "\u2014";
}

// Layout-derived geometry constants.
const PANEL_TITLE_HEIGHT = 38;
const TAB_BAR_HEIGHT = 40;
const SUMMARY_HEIGHT = 50;
const BUTTON_AREA_HEIGHT = 52;
const CONTENT_INNER_INSET = 12;

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export class ContractsScene extends Phaser.Scene {
  private ui!: SceneUiDirector;
  private portrait!: PortraitPanel;
  private mainPanel!: Panel;
  private tabGroup!: TabGroup;
  private availableTable!: DataTable;
  private availableTableFrame!: ScrollFrame;
  private activeTable!: DataTable;
  private activeTableFrame!: ScrollFrame;
  private availableSummary!: Phaser.GameObjects.Text;
  private activeSummary!: Phaser.GameObjects.Text;
  private acceptButton!: Button;
  private abandonButton!: Button;
  private selectedAvailableId: string | null = null;
  private selectedActiveId: string | null = null;

  constructor() {
    super({ key: "ContractsScene" });
  }

  create(): void {
    this.selectedAvailableId = null;
    this.selectedActiveId = null;
    this.ui = new SceneUiDirector(this);
    const L = getLayout();

    createStarfield(this);

    // Sidebar portrait
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portrait.updatePortrait("event", 0, "Contracts", [], {
      eventCategory: "opportunity",
    });

    // ── Build tab content containers ──
    const availableContent = this.add.container(0, 0);
    const activeContent = this.add.container(0, 0);

    // ── Main Panel with TabGroup ──
    this.mainPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Contract Board",
    });

    this.tabGroup = new TabGroup(this, {
      x: L.mainContentLeft,
      y: L.contentTop + PANEL_TITLE_HEIGHT,
      width: L.mainContentWidth,
      tabs: [
        { label: "\u2606 Available", content: availableContent },
        { label: "\u2611 Active", content: activeContent },
      ],
      defaultTab: 0,
    });

    const initialContentInnerW = L.mainContentWidth - CONTENT_INNER_INSET * 2;
    const initialTableHeight =
      L.contentHeight -
      PANEL_TITLE_HEIGHT -
      TAB_BAR_HEIGHT -
      SUMMARY_HEIGHT -
      BUTTON_AREA_HEIGHT -
      8;

    // ════════════════════════════════════════════════════════════════
    // TAB 0 — AVAILABLE CONTRACTS
    // ════════════════════════════════════════════════════════════════

    // Plain Phaser.GameObjects.Text — relayout reflows wrap width via
    // setWordWrapWidth(). No sub-widget wrapper needed here.
    this.availableSummary = this.add.text(CONTENT_INNER_INSET, 8, "", {
      fontSize: `${getTheme().fonts.caption.size}px`,
      fontFamily: getTheme().fonts.caption.family,
      color: colorToString(getTheme().colors.textDim),
      wordWrap: { width: initialContentInnerW },
    });
    availableContent.add(this.availableSummary);

    this.availableTableFrame = new ScrollFrame(this, {
      x: CONTENT_INNER_INSET,
      y: SUMMARY_HEIGHT,
      width: initialContentInnerW,
      height: initialTableHeight,
    });
    availableContent.add(this.availableTableFrame);
    this.availableTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: initialContentInnerW,
      height: initialTableHeight,
      contentSized: true,
      columns: [
        {
          key: "type",
          label: "Type",
          width: 160,
          sortable: true,
        },
        { key: "origin", label: "From", width: 110, sortable: true },
        { key: "destination", label: "To", width: 110, sortable: true },
        {
          key: "cargo",
          label: "Cargo",
          width: 100,
          sortable: true,
          format: (v) => getCargoLabel(v as string),
          iconFn: (v) => getCargoIconKey(v as string),
          iconTintFn: (v) => getCargoColor(v as string),
        },
        {
          key: "duration",
          label: "Turns",
          width: 60,
          align: "right",
          sortable: true,
        },
        {
          key: "deposit",
          label: "Deposit",
          width: 80,
          align: "right",
          format: (v) => formatCompact(v as number),
          colorFn: () => getTheme().colors.loss,
        },
        {
          key: "reward",
          label: "Reward",
          width: 180,
        },
      ],
      keyboardNavigation: true,
      autoFocus: true,
      emptyStateText: "No contracts available",
      emptyStateHint: "Contracts refresh each turn.",
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedAvailableId = rowData["id"] as string;
        this.updateAvailablePortrait();
        this.updateAcceptButton();
      },
      onRowActivate: (_rowIndex, rowData) => {
        this.selectedAvailableId = rowData["id"] as string;
        this.confirmAcceptContract();
      },
    });
    this.availableTableFrame.setContent(this.availableTable);

    // Accept button — y is computed during relayout.
    this.acceptButton = new Button(this, {
      x: CONTENT_INNER_INSET,
      y: 0,
      autoWidth: true,
      label: "Accept Contract [Enter]",
      disabled: true,
      onClick: () => this.confirmAcceptContract(),
    });
    availableContent.add(this.acceptButton);

    // ════════════════════════════════════════════════════════════════
    // TAB 1 — ACTIVE CONTRACTS
    // ════════════════════════════════════════════════════════════════

    // Plain Phaser.GameObjects.Text — relayout reflows wrap width.
    this.activeSummary = this.add.text(CONTENT_INNER_INSET, 8, "", {
      fontSize: `${getTheme().fonts.caption.size}px`,
      fontFamily: getTheme().fonts.caption.family,
      color: colorToString(getTheme().colors.textDim),
      wordWrap: { width: initialContentInnerW },
    });
    activeContent.add(this.activeSummary);

    this.activeTableFrame = new ScrollFrame(this, {
      x: CONTENT_INNER_INSET,
      y: SUMMARY_HEIGHT,
      width: initialContentInnerW,
      height: initialTableHeight,
    });
    activeContent.add(this.activeTableFrame);
    this.activeTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: initialContentInnerW,
      height: initialTableHeight,
      contentSized: true,
      columns: [
        {
          key: "type",
          label: "Contract",
          width: 160,
          sortable: true,
        },
        { key: "route", label: "Route", width: 180, sortable: true },
        {
          key: "cargo",
          label: "Cargo",
          width: 100,
          sortable: true,
          format: (v) => getCargoLabel(v as string),
          iconFn: (v) => getCargoIconKey(v as string),
          iconTintFn: (v) => getCargoColor(v as string),
        },
        {
          key: "turnsLeft",
          label: "Turns Left",
          width: 80,
          align: "right",
          sortable: true,
        },
        {
          key: "status",
          label: "Status",
          width: 100,
          colorFn: (v) => {
            const status = v as string;
            const t = getTheme();
            if (status === "Completed") return t.colors.profit;
            if (status === "Failed" || status === "Expired")
              return t.colors.loss;
            if (status === "Active") return t.colors.profit;
            return t.colors.textDim;
          },
        },
        {
          key: "reward",
          label: "Reward",
          width: 180,
        },
      ],
      keyboardNavigation: false,
      autoFocus: true,
      emptyStateText: "No active contracts",
      emptyStateHint: "Accept a contract from the Available tab.",
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedActiveId = rowData["id"] as string;
        this.updateActivePortrait();
        this.updateAbandonButton();
      },
      onRowActivate: (_rowIndex, rowData) => {
        this.selectedActiveId = rowData["id"] as string;
        this.updateActivePortrait();
      },
    });
    this.activeTableFrame.setContent(this.activeTable);

    // Abandon button — y is computed during relayout.
    this.abandonButton = new Button(this, {
      x: CONTENT_INNER_INSET,
      y: 0,
      autoWidth: true,
      label: "Abandon Contract",
      disabled: true,
      onClick: () => this.confirmAbandonContract(),
    });
    activeContent.add(this.abandonButton);

    // ── Initial refresh ──
    this.refreshAvailableTable();
    this.refreshActiveTable();

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const tabH = GROUP_TAB_STRIP_HEIGHT;
    const contentTop = L.contentTop + tabH;
    const contentHeight = L.contentHeight - tabH;

    // PortraitPanel: setPosition before setSize.
    this.portrait.setPosition(L.sidebarLeft, contentTop);
    this.portrait.setSize(L.sidebarWidth, contentHeight);

    // Main panel.
    this.mainPanel.setPosition(L.mainContentLeft, contentTop);
    this.mainPanel.setSize(L.mainContentWidth, contentHeight);

    // Tab strip below panel title.
    this.tabGroup.setPosition(
      L.mainContentLeft,
      contentTop + PANEL_TITLE_HEIGHT,
    );
    this.tabGroup.setSize(L.mainContentWidth, this.tabGroup.height);

    // Recompute inner geometry — child positions inside tab content
    // containers are relative to the container origin (set by TabGroup).
    const contentInnerW = L.mainContentWidth - CONTENT_INNER_INSET * 2;
    const tableHeight =
      contentHeight -
      PANEL_TITLE_HEIGHT -
      TAB_BAR_HEIGHT -
      SUMMARY_HEIGHT -
      BUTTON_AREA_HEIGHT -
      8;
    const tableTop = SUMMARY_HEIGHT;
    const buttonY = tableTop + tableHeight + 8;

    // Available tab.
    this.availableSummary.setPosition(CONTENT_INNER_INSET, 8);
    this.availableSummary.setWordWrapWidth(contentInnerW);
    this.availableTableFrame.setPosition(CONTENT_INNER_INSET, tableTop);
    this.availableTableFrame.setSize(contentInnerW, tableHeight);
    this.availableTable.setSize(contentInnerW, tableHeight);
    this.acceptButton.setPosition(CONTENT_INNER_INSET, buttonY);

    // Active tab.
    this.activeSummary.setPosition(CONTENT_INNER_INSET, 8);
    this.activeSummary.setWordWrapWidth(contentInnerW);
    this.activeTableFrame.setPosition(CONTENT_INNER_INSET, tableTop);
    this.activeTableFrame.setSize(contentInnerW, tableHeight);
    this.activeTable.setSize(contentInnerW, tableHeight);
    this.abandonButton.setPosition(CONTENT_INNER_INSET, buttonY);
  }

  // ════════════════════════════════════════════════════════════════
  // Available Contracts Tab
  // ════════════════════════════════════════════════════════════════

  private refreshAvailableTable(): void {
    const state = gameStore.getState();
    const available = state.contracts.filter(
      (c) => c.status === ContractStatus.Available,
    );
    const slotsUsed = getUsedRouteSlots(state);
    const slotsTotal = getAvailableRouteSlots(state);
    this.availableSummary.setText(
      `${available.length} contract${available.length !== 1 ? "s" : ""} available \u2022 Slots ${slotsUsed}/${slotsTotal} \u2022 §${state.cash.toLocaleString("en-US")} cash`,
    );

    const { planets } = state.galaxy;
    const rows = available.map((c) => {
      const origin = planets.find((p) => p.id === c.originPlanetId);
      const dest = planets.find((p) => p.id === c.destinationPlanetId);
      return {
        id: c.id,
        type: contractTypeLabel(c.type),
        origin: origin?.name ?? "?",
        destination: dest?.name ?? "?",
        cargo: c.cargoType,
        duration: c.durationTurns,
        deposit: c.depositPaid,
        reward: rewardSummary(c),
      };
    });
    this.availableTable.setRows(rows);
    this.updateAcceptButton();
  }

  private updateAvailablePortrait(): void {
    if (!this.selectedAvailableId) return;
    const state = gameStore.getState();
    const c = state.contracts.find((ct) => ct.id === this.selectedAvailableId);
    if (!c) return;

    const { planets, systems, empires } = state.galaxy;
    const origin = planets.find((p) => p.id === c.originPlanetId);
    const dest = planets.find((p) => p.id === c.destinationPlanetId);
    const originSys = origin
      ? systems.find((s) => s.id === origin.systemId)
      : null;
    const destSys = dest ? systems.find((s) => s.id === dest.systemId) : null;
    const originEmpire = originSys
      ? empires.find((e) => e.id === originSys.empireId)
      : null;
    const destEmpire = destSys
      ? empires.find((e) => e.id === destSys.empireId)
      : null;

    const details: Array<{ label: string; value: string }> = [
      { label: "Type", value: contractTypeLabel(c.type) },
      {
        label: "From",
        value: `${origin?.name ?? "?"} (${originEmpire?.name ?? "?"})`,
      },
      {
        label: "To",
        value: `${dest?.name ?? "?"} (${destEmpire?.name ?? "?"})`,
      },
      { label: "Cargo", value: getCargoLabel(c.cargoType) },
      { label: "Duration", value: `${c.durationTurns} turns` },
      { label: "Deposit", value: formatCash(c.depositPaid) },
      { label: "Reward", value: rewardSummary(c) },
    ];

    this.portrait.updatePortrait(
      "planet",
      dest ? (dest.type === "frontier" ? 0 : 1) : 0,
      contractTypeLabel(c.type),
      details,
      { planetType: dest?.type ?? "frontier" },
    );
  }

  private updateAcceptButton(): void {
    // Stale selection can leave the button enabled after a contract accept
    // empties the list. Guard against "no selection", "no available contracts
    // left at all", and "selected id no longer available".
    const state = gameStore.getState();
    const available = state.contracts.filter(
      (c) => c.status === ContractStatus.Available,
    );
    const selectionStillValid =
      this.selectedAvailableId !== null &&
      available.some((c) => c.id === this.selectedAvailableId);
    this.acceptButton.setDisabled(
      available.length === 0 || !selectionStillValid,
    );
  }

  private confirmAcceptContract(): void {
    if (!this.selectedAvailableId) return;
    const state = gameStore.getState();
    const c = state.contracts.find(
      (ct) =>
        ct.id === this.selectedAvailableId &&
        ct.status === ContractStatus.Available,
    );
    if (!c) return;

    const slotsUsed = getUsedRouteSlots(state);
    const slotsTotal = getAvailableRouteSlots(state);
    if (slotsUsed >= slotsTotal) {
      new Modal(this, {
        title: "No Route Slots",
        body: "You have no free route slots. Delete an existing route or research technology to unlock more slots.",
        okText: "OK",
        onOk: () => {},
      }).show();
      return;
    }

    const { planets } = state.galaxy;
    const origin = planets.find((p) => p.id === c.originPlanetId);
    const dest = planets.find((p) => p.id === c.destinationPlanetId);

    // ── FUTURE: Negotiation Modal (Track 2.3) ──────────────────────────────
    // Before showing the simple confirm dialog below, present a 3-option
    // negotiation panel to the player using getNegotiationOptions() from
    // ContractNegotiation.ts. The player picks one of:
    //   • Standard Terms  — no changes (always available)
    //   • Haggle          — 1.3× reward / 0.9× deadline, 60% success (rep ≥ 25)
    //   • Early Bonus     — 1.5× reward + 1.5× deposit / 0.7× deadline (rep ≥ 50)
    // On confirm, call acceptContractWithNegotiation(c.id, choice, state, rng)
    // from ContractManager.ts instead of acceptContract().
    // The backend logic is fully implemented; only the UI modal is pending.
    // ───────────────────────────────────────────────────────────────────────

    const theme = getTheme();
    const L = getLayout();

    let autoBuyChecked = true;

    const layer = this.ui.openLayer({ key: "accept-contract" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: false,
    });

    const panelW = 480;
    const panelH = 340;
    const panelX = (L.gameWidth - panelW) / 2;
    const panelY = (L.gameHeight - panelH) / 2;

    layer
      .track(
        new Panel(this, {
          x: panelX,
          y: panelY,
          width: panelW,
          height: panelH,
          title: "Accept Contract?",
        }),
      )
      .setDepth(DEPTH_MODAL);

    layer
      .track(
        this.add.text(
          panelX + 16,
          panelY + 50,
          [
            contractTypeLabel(c.type),
            `Route: ${origin?.name ?? "?"} \u2192 ${dest?.name ?? "?"}`,
            `Cargo: ${getCargoLabel(c.cargoType)}`,
            `Duration: ${c.durationTurns} turns`,
            `Deposit: ${formatCash(c.depositPaid)}`,
            `Reward: ${rewardSummary(c)}`,
          ].join("\n"),
          {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.color.text.primary),
            lineSpacing: 4,
            wordWrap: { width: panelW - 32 },
          },
        ),
      )
      .setDepth(DEPTH_MODAL);

    // Checkbox \u2014 "Auto-buy cheapest ship if none idle".
    const cbY = panelY + panelH - 88;
    const cbSize = 16;

    const checkBg = layer
      .track(
        this.add
          .rectangle(panelX + 16 + cbSize / 2, cbY + cbSize / 2, cbSize, cbSize)
          .setStrokeStyle(1, theme.color.accent.primary)
          .setFillStyle(theme.color.surface.default)
          .setInteractive({ useHandCursor: true }),
      )
      .setDepth(DEPTH_MODAL);

    const checkMark = layer
      .track(
        this.add
          .text(panelX + 16 + cbSize / 2, cbY + cbSize / 2, "\u2713", {
            fontSize: "13px",
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.color.accent.primary),
          })
          .setOrigin(0.5),
      )
      .setDepth(DEPTH_MODAL)
      .setVisible(autoBuyChecked);

    const cbLabel = layer
      .track(
        this.add
          .text(
            panelX + 16 + cbSize + 8,
            cbY,
            "Auto-buy cheapest ship if none idle",
            {
              fontSize: `${theme.fonts.body.size}px`,
              fontFamily: theme.fonts.body.family,
              color: colorToString(theme.color.text.primary),
            },
          )
          .setInteractive({ useHandCursor: true }),
      )
      .setDepth(DEPTH_MODAL);

    const toggleCheckbox = () => {
      autoBuyChecked = !autoBuyChecked;
      checkMark.setVisible(autoBuyChecked);
      checkBg.setStrokeStyle(
        1,
        autoBuyChecked ? theme.color.accent.primary : theme.color.text.muted,
      );
    };
    checkBg.on("pointerup", toggleCheckbox);
    cbLabel.on("pointerup", toggleCheckbox);

    // Buttons.
    const buttonY = panelY + panelH - 52;

    layer
      .track(
        new Button(this, {
          x: panelX + panelW / 2 - 110,
          y: buttonY,
          width: 100,
          label: "Accept",
          onClick: () => {
            layer.destroy();
            const freshState = gameStore.getState();
            const patch = acceptContract(c.id, freshState);
            if (!patch) return;

            let nextState = { ...freshState, ...patch };

            if (autoBuyChecked) {
              const hasIdleShip = nextState.fleet.some(
                (s) => !s.assignedRouteId,
              );
              if (!hasIdleShip) {
                const cheapestClass = Object.values(ShipClass).reduce(
                  (best, cls) =>
                    SHIP_TEMPLATES[cls].purchaseCost <
                    SHIP_TEMPLATES[best].purchaseCost
                      ? cls
                      : best,
                );
                if (
                  nextState.cash >= SHIP_TEMPLATES[cheapestClass].purchaseCost
                ) {
                  const { ship, cost } = buyShip(
                    cheapestClass,
                    nextState.fleet,
                  );
                  nextState = {
                    ...nextState,
                    fleet: [...nextState.fleet, ship],
                    cash: nextState.cash - cost,
                  };
                }
              }
            }

            gameStore.setState(nextState);
            this.selectedAvailableId = null;
            this.refreshAvailableTable();
            this.refreshActiveTable();
            this.portrait.updatePortrait(
              "event",
              0,
              "Contract Accepted!",
              [
                {
                  label: "Status",
                  value:
                    "Route created. Assign a ship to start fulfilling the contract.",
                },
              ],
              { eventCategory: "opportunity" },
            );
          },
        }),
      )
      .setDepth(DEPTH_MODAL);

    layer
      .track(
        new Button(this, {
          x: panelX + panelW / 2 + 10,
          y: buttonY,
          width: 100,
          label: "Cancel",
          onClick: () => layer.destroy(),
        }),
      )
      .setDepth(DEPTH_MODAL);
  }

  // ════════════════════════════════════════════════════════════════
  // Active Contracts Tab
  // ════════════════════════════════════════════════════════════════

  private refreshActiveTable(): void {
    const state = gameStore.getState();
    const active = state.contracts.filter(
      (c) => c.status === ContractStatus.Active,
    );
    const completed = state.contracts.filter(
      (c) => c.status === ContractStatus.Completed,
    ).length;
    this.activeSummary.setText(
      `${active.length} active \u2022 ${completed} completed`,
    );

    const { planets } = state.galaxy;
    const rows = active.map((c) => {
      const origin = planets.find((p) => p.id === c.originPlanetId);
      const dest = planets.find((p) => p.id === c.destinationPlanetId);
      return {
        id: c.id,
        type: contractTypeLabel(c.type),
        route: `${origin?.name ?? "?"} \u2192 ${dest?.name ?? "?"}`,
        cargo: c.cargoType,
        turnsLeft: c.turnsRemaining,
        status: contractStatusLabel(c),
        reward: rewardSummary(c),
      };
    });
    this.activeTable.setRows(rows);
    this.updateAbandonButton();
  }

  private updateActivePortrait(): void {
    if (!this.selectedActiveId) return;
    const state = gameStore.getState();
    const c = state.contracts.find((ct) => ct.id === this.selectedActiveId);
    if (!c) return;

    const { planets, systems, empires } = state.galaxy;
    const origin = planets.find((p) => p.id === c.originPlanetId);
    const dest = planets.find((p) => p.id === c.destinationPlanetId);
    const destSys = dest ? systems.find((s) => s.id === dest.systemId) : null;
    const destEmpire = destSys
      ? empires.find((e) => e.id === destSys.empireId)
      : null;

    const route = state.activeRoutes.find((r) => r.id === c.linkedRouteId);
    const shipCount = route ? route.assignedShipIds.length : 0;
    const hasShip = shipCount > 0;

    const details: Array<{ label: string; value: string }> = [
      { label: "Type", value: contractTypeLabel(c.type) },
      {
        label: "Route",
        value: `${origin?.name ?? "?"} \u2192 ${dest?.name ?? "?"}`,
      },
      { label: "Empire", value: destEmpire?.name ?? "?" },
      { label: "Cargo", value: getCargoLabel(c.cargoType) },
      { label: "Turns Left", value: `${c.turnsRemaining}` },
      { label: "Ships", value: `${shipCount}` },
      {
        label: "Status",
        value: hasShip ? "\u2713 On Track" : "\u26A0 No ship assigned!",
      },
      { label: "Reward", value: rewardSummary(c) },
    ];

    this.portrait.updatePortrait(
      "planet",
      dest ? (dest.type === "frontier" ? 0 : 1) : 0,
      contractTypeLabel(c.type),
      details,
      { planetType: dest?.type ?? "frontier" },
    );
  }

  private updateAbandonButton(): void {
    this.abandonButton.setDisabled(!this.selectedActiveId);
  }

  private confirmAbandonContract(): void {
    if (!this.selectedActiveId) return;
    const state = gameStore.getState();
    const c = state.contracts.find(
      (ct) =>
        ct.id === this.selectedActiveId && ct.status === ContractStatus.Active,
    );
    if (!c) return;

    new Modal(this, {
      title: "Abandon Contract?",
      body: [
        `Are you sure you want to abandon this contract?`,
        "",
        contractTypeLabel(c.type),
        `Turns remaining: ${c.turnsRemaining}`,
        "",
        "Penalties:",
        `\u2022 Lose deposit: ${formatCash(c.depositPaid)}`,
        `\u2022 Reputation penalty`,
        "",
        "The linked route will remain but can be deleted separately.",
      ].join("\n"),
      okText: "Abandon",
      onOk: () => {
        const freshState = gameStore.getState();
        const patch = abandonContract(c.id, freshState);
        if (patch) {
          gameStore.setState({ ...freshState, ...patch });
          this.selectedActiveId = null;
          this.refreshActiveTable();
          this.refreshAvailableTable();
          this.portrait.updatePortrait(
            "event",
            0,
            "Contract Abandoned",
            [
              {
                label: "Status",
                value: "The contract has been abandoned. Penalties applied.",
              },
            ],
            { eventCategory: "hazard" },
          );
        }
      },
    }).show();
  }
}
