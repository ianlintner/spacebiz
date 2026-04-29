import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { Loan } from "../data/types.ts";
import {
  LOAN_INTEREST_RATE_MIN,
  LOAN_INTEREST_RATE_MAX,
} from "../data/constants.ts";
import {
  getTheme,
  colorToString,
  Button,
  TabGroup,
  DataTable,
  ScrollFrame,
  Modal,
  Panel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  Slider,
} from "@spacebiz/ui";
import { PortraitPanel } from "@rogue-universe/shared";
import { calculateShipValue } from "../game/fleet/FleetManager.ts";
import { getHubUpkeep } from "../game/hub/HubManager.ts";
import { getRevenueMultiplier } from "../game/hub/HubBonusCalculator.ts";

import { getPortraitTextureKey } from "../data/portraits.ts";
import {
  portraitLoader,
  PORTRAIT_PLACEHOLDER_KEY,
} from "../game/PortraitLoader.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function fitImageCover(
  image: Phaser.GameObjects.Image,
  width: number,
  height: number,
): void {
  const srcW = Math.max(1, image.width);
  const srcH = Math.max(1, image.height);
  const scale = Math.max(width / srcW, height / srcH);
  image.setDisplaySize(srcW * scale, srcH * scale);
}

export class FinanceScene extends Phaser.Scene {
  private selectedLoanId: string | null = null;
  private ui!: SceneUiDirector;

  constructor() {
    super({ key: "FinanceScene" });
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    this.selectedLoanId = null;
    this.ui = new SceneUiDirector(this);

    // Animated starfield background
    createStarfield(this);

    const state = gameStore.getState();

    // --- Left sidebar: Company health portrait ---
    const fleetValue = state.fleet.reduce(
      (sum, ship) => sum + calculateShipValue(ship),
      0,
    );
    const totalLoans = state.loans.reduce(
      (sum, loan) => sum + loan.remainingBalance,
      0,
    );
    const netWorth = state.cash + fleetValue - totalLoans;

    const portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    portrait.updatePortrait(
      "event",
      state.turn,
      "Company Health",
      [
        { label: "Cash", value: formatCash(state.cash) },
        { label: "Net Worth", value: formatCash(netWorth) },
        { label: "Fleet Value", value: formatCash(fleetValue) },
        { label: "Loans", value: formatCash(totalLoans) },
      ],
      { eventCategory: "market" },
    );

    // Overlay CEO portrait image on the sidebar panel
    const ceoPortraitKey = getPortraitTextureKey(state.ceoPortrait.portraitId);
    const pSize = Math.min(L.sidebarWidth - 24, 120);
    const pX = L.sidebarLeft + L.sidebarWidth / 2;
    const pY = L.contentTop + 16 + pSize / 2;
    const initialPortraitKey = this.textures.exists(ceoPortraitKey)
      ? ceoPortraitKey
      : PORTRAIT_PLACEHOLDER_KEY;
    const ceoImg = this.add
      .image(pX, pY, initialPortraitKey)
      .setOrigin(0.5, 0.5)
      .setDepth(10);
    fitImageCover(ceoImg, pSize, pSize);
    // Round mask (Phaser 4 Mask filter)
    const ceoMask = this.add
      .circle(pX, pY, pSize / 2, 0xffffff)
      .setVisible(false);
    ceoImg.filters?.internal.addMask(ceoMask);
    // Border
    this.add
      .circle(pX, pY, pSize / 2 + 1)
      .setStrokeStyle(2, theme.colors.accent)
      .setFillStyle(0x000000, 0)
      .setDepth(11);
    // Fetch on-demand if not already loaded
    if (!this.textures.exists(ceoPortraitKey)) {
      portraitLoader
        .ensureCeoPortrait(this, state.ceoPortrait.portraitId)
        .then((key) => {
          if (ceoImg.active) {
            ceoImg.setTexture(key);
            fitImageCover(ceoImg, pSize, pSize);
          }
        })
        .catch(() => {
          /* leave placeholder */
        });
    }

    // --- Main content panel with title ---
    const mainPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Finance",
    });

    const contentArea = mainPanel.getContentArea();

    // Build tab contents
    const plContent = this.buildPLTab();
    const balanceContent = this.buildBalanceTab();
    const loansContent = this.buildLoansTab();

    // Tab group positioned inside the main content panel
    new TabGroup(this, {
      x: L.mainContentLeft + contentArea.x,
      y: L.contentTop + contentArea.y,
      width: contentArea.width,
      tabs: [
        { label: "P&L", content: plContent },
        { label: "Balance", content: balanceContent },
        { label: "Loans", content: loansContent },
      ],
    });
  }

  private buildPLTab(): Phaser.GameObjects.Container {
    const theme = getTheme();
    const container = this.add.container(0, 0);
    const state = gameStore.getState();

    let y = 20;
    const x = 20;
    const valueX = 300;

    const addRow = (label: string, value: string, color?: number) => {
      const labelText = this.add.text(x, y, label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: valueX - x - 10 },
      });
      container.add(labelText);

      const valueText = this.add.text(valueX, y, value, {
        fontSize: `${theme.fonts.value.size}px`,
        fontFamily: theme.fonts.value.family,
        color: colorToString(color ?? theme.colors.text),
      });
      container.add(valueText);
      y += 32;
    };

    const addSeparator = () => {
      const line = this.add
        .rectangle(x, y + 4, 500, 1, theme.colors.panelBorder)
        .setOrigin(0, 0);
      container.add(line);
      y += 12;
    };

    // Last turn P&L
    const history = state.history;
    const lastTurn = history.length > 0 ? history[history.length - 1] : null;

    const headerText = this.add.text(
      x,
      y,
      lastTurn ? `Last Turn (#${lastTurn.turn}) P&L` : "No turns completed yet",
      {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      },
    );
    container.add(headerText);
    y += 40;

    if (lastTurn) {
      addRow("Revenue", formatCash(lastTurn.revenue), theme.colors.profit);
      addRow("Fuel Costs", formatCash(-lastTurn.fuelCosts), theme.colors.loss);
      addRow(
        "Maintenance",
        formatCash(-lastTurn.maintenanceCosts),
        theme.colors.loss,
      );
      addRow(
        "Loan Payments",
        formatCash(-lastTurn.loanPayments),
        theme.colors.loss,
      );
      if (lastTurn.otherCosts > 0) {
        addRow(
          "Hub & Other",
          formatCash(-lastTurn.otherCosts),
          theme.colors.loss,
        );
      }
      addSeparator();
      addRow(
        "Net Profit",
        formatCash(lastTurn.netProfit),
        lastTurn.netProfit >= 0 ? theme.colors.profit : theme.colors.loss,
      );
    }

    // Cumulative totals
    if (history.length > 0) {
      y += 20;
      const cumHeaderText = this.add.text(x, y, "Cumulative Totals", {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      });
      container.add(cumHeaderText);
      y += 40;

      const totalRevenue = history.reduce((sum, t) => sum + t.revenue, 0);
      const totalFuel = history.reduce((sum, t) => sum + t.fuelCosts, 0);
      const totalMaint = history.reduce(
        (sum, t) => sum + t.maintenanceCosts,
        0,
      );
      const totalLoan = history.reduce((sum, t) => sum + t.loanPayments, 0);
      const totalProfit = history.reduce((sum, t) => sum + t.netProfit, 0);

      addRow("Total Revenue", formatCash(totalRevenue), theme.colors.profit);
      addRow("Total Fuel", formatCash(-totalFuel), theme.colors.loss);
      addRow("Total Maintenance", formatCash(-totalMaint), theme.colors.loss);
      addRow("Total Loan Payments", formatCash(-totalLoan), theme.colors.loss);
      const totalOther = history.reduce((sum, t) => sum + t.otherCosts, 0);
      if (totalOther > 0) {
        addRow("Total Hub & Other", formatCash(-totalOther), theme.colors.loss);
      }
      addSeparator();
      addRow(
        "Total Net Profit",
        formatCash(totalProfit),
        totalProfit >= 0 ? theme.colors.profit : theme.colors.loss,
      );
    }

    // ── Hub Station P&L ────────────────────────────────────────
    if (state.stationHub !== null) {
      const hub = state.stationHub;
      y += 24;
      const hubHeaderText = this.add.text(x, y, "Hub Station P&L", {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      });
      container.add(hubHeaderText);
      y += 40;

      const hubUpkeep = getHubUpkeep(hub);
      const revenueMultiplier = getRevenueMultiplier(hub);
      const revenueBonusPct = Math.round((revenueMultiplier - 1) * 100);

      // Estimate revenue bonus using last turn's revenue if available
      const lastTurnRevenue =
        history.length > 0 ? (history[history.length - 1]?.revenue ?? 0) : 0;
      const estimatedRevenueBonus = Math.round(
        lastTurnRevenue * (revenueMultiplier - 1),
      );
      const hubNet = estimatedRevenueBonus - hubUpkeep;

      addRow("Hub Level", `${hub.level}`, theme.colors.text);
      addRow("Rooms Installed", `${hub.rooms.length}`, theme.colors.text);
      addRow(
        "Upkeep / Turn",
        formatCash(-hubUpkeep),
        hubUpkeep > 0 ? theme.colors.loss : theme.colors.text,
      );
      addRow(
        "Revenue Bonus",
        `+${revenueBonusPct}%${lastTurnRevenue > 0 ? `  (≈ ${formatCash(estimatedRevenueBonus)}/turn)` : ""}`,
        theme.colors.profit,
      );
      addSeparator();
      addRow(
        "Hub Net / Turn",
        formatCash(hubNet),
        hubNet >= 0 ? theme.colors.profit : theme.colors.loss,
      );
    }

    return container;
  }

  private buildBalanceTab(): Phaser.GameObjects.Container {
    const theme = getTheme();
    const container = this.add.container(0, 0);
    const state = gameStore.getState();

    let y = 20;
    const x = 20;
    const valueX = 300;

    const addRow = (label: string, value: string, color?: number) => {
      const labelText = this.add.text(x, y, label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: valueX - x - 10 },
      });
      container.add(labelText);

      const valueText = this.add.text(valueX, y, value, {
        fontSize: `${theme.fonts.value.size}px`,
        fontFamily: theme.fonts.value.family,
        color: colorToString(color ?? theme.colors.text),
      });
      container.add(valueText);
      y += 36;
    };

    const addSeparator = () => {
      const line = this.add
        .rectangle(x, y + 4, 500, 1, theme.colors.panelBorder)
        .setOrigin(0, 0);
      container.add(line);
      y += 12;
    };

    // Cash
    addRow("Cash", formatCash(state.cash), theme.colors.accent);

    // Fleet value
    const fleetValue = state.fleet.reduce(
      (sum, ship) => sum + calculateShipValue(ship),
      0,
    );
    addRow("Fleet Value", formatCash(fleetValue), theme.colors.profit);

    // Total loans
    const totalLoans = state.loans.reduce(
      (sum, loan) => sum + loan.remainingBalance,
      0,
    );
    addRow(
      "Loans Outstanding",
      formatCash(totalLoans),
      totalLoans > 0 ? theme.colors.loss : theme.colors.text,
    );

    addSeparator();

    // Net worth
    const netWorth = state.cash + fleetValue - totalLoans;
    addRow(
      "Net Worth",
      formatCash(netWorth),
      netWorth >= 0 ? theme.colors.profit : theme.colors.loss,
    );

    return container;
  }

  private buildLoansTab(): Phaser.GameObjects.Container {
    const L = getLayout();
    const theme = getTheme();
    const container = this.add.container(0, 0);
    const state = gameStore.getState();

    // Loans table — fits within main content area
    const loanTableFrame = new ScrollFrame(this, {
      x: 0,
      y: 20,
      width: L.mainContentWidth - 20,
      height: 280,
    });
    const loanTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: L.mainContentWidth - 20,
      height: 280,
      contentSized: true,
      columns: [
        {
          key: "principal",
          label: "Principal",
          width: 140,
          align: "right",
          format: (v) => formatCash(v as number),
        },
        {
          key: "rate",
          label: "Rate",
          width: 100,
          align: "right",
          format: (v) => `${((v as number) * 100).toFixed(1)}%`,
        },
        {
          key: "remaining",
          label: "Remaining",
          width: 160,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: () => theme.colors.loss,
        },
        {
          key: "turnTaken",
          label: "Turn Taken",
          width: 120,
          align: "center",
        },
      ],
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedLoanId = rowData["id"] as string;
      },
    });

    const loanRows = state.loans.map((loan: Loan) => ({
      id: loan.id,
      principal: loan.principal,
      rate: loan.interestRate,
      remaining: loan.remainingBalance,
      turnTaken: loan.turnTaken,
    }));
    loanTable.setRows(loanRows);

    // Move the frame into the container; ScrollFrame owns the table.
    loanTableFrame.setContent(loanTable);
    container.add(loanTableFrame);

    // "Take Loan" button
    const takeLoanBtn = new Button(this, {
      x: 0,
      y: 320,
      width: 140,
      label: "Take Loan",
      onClick: () => this.showTakeLoan(loanTable),
    });
    container.add(takeLoanBtn);

    // "Repay Loan" button
    const repayBtn = new Button(this, {
      x: 160,
      y: 320,
      width: 140,
      label: "Repay Loan",
      onClick: () => this.repaySelectedLoan(loanTable),
    });
    container.add(repayBtn);

    return container;
  }

  private showTakeLoan(loanTable: DataTable): void {
    const L = getLayout();
    const theme = getTheme();
    const rate =
      LOAN_INTEREST_RATE_MIN +
      Math.random() * (LOAN_INTEREST_RATE_MAX - LOAN_INTEREST_RATE_MIN);

    // Slider UI range (narrower than MAX_LOAN_AMOUNT for UX)
    const LOAN_SLIDER_MIN = 50000;
    const LOAN_SLIDER_MAX = 200000;
    const LOAN_SLIDER_STEP = 10000;

    let selectedLoanAmount: number = 100000; // Default to middle value

    const layer = this.ui.openLayer({ key: "finance-take-loan" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 400;
    const panelH = 350;
    const panelX = (L.gameWidth - panelW) / 2;
    const panelY = (L.gameHeight - panelH) / 2;

    const loanPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: `Take Loan (${(rate * 100).toFixed(1)}% interest)`,
      }),
    );

    const content = loanPanel.getContentArea();

    // Create loan amount slider
    const loanSlider = layer.track(
      new Slider(this, {
        x: panelX + content.x + 20,
        y: panelY + content.y + 30,
        width: content.width - 40,
        min: LOAN_SLIDER_MIN,
        max: LOAN_SLIDER_MAX,
        step: LOAN_SLIDER_STEP,
        value: selectedLoanAmount,
        label: "Loan Amount",
        showValue: true,
        formatValue: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      }),
    );

    // Display interest cost info
    const interestDisplay = this.add.text(
      panelX + content.x + 20,
      panelY + content.y + 100,
      `Interest per turn: ${formatCash(Math.round(selectedLoanAmount * rate))}`,
      {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
      },
    );
    layer.track(interestDisplay);

    // Update selectedLoanAmount and interest display when slider changes
    loanSlider.on("change", (value: number) => {
      selectedLoanAmount = value;
      interestDisplay.setText(
        `Interest per turn: ${formatCash(Math.round(value * rate))}`,
      );
    });

    // Accept button
    layer.track(
      new Button(this, {
        x: panelX + panelW - content.x - 210,
        y: panelY + panelH - 50,
        width: 100,
        label: "Accept",
        onClick: () => {
          const freshState = gameStore.getState();
          const loan: Loan = {
            id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            principal: selectedLoanAmount,
            interestRate: rate,
            remainingBalance: selectedLoanAmount,
            turnTaken: freshState.turn,
          };

          gameStore.update({
            cash: freshState.cash + selectedLoanAmount,
            loans: [...freshState.loans, loan],
          });

          // Refresh loan table
          const updatedState = gameStore.getState();
          loanTable.setRows(
            updatedState.loans.map((l: Loan) => ({
              id: l.id,
              principal: l.principal,
              rate: l.interestRate,
              remaining: l.remainingBalance,
              turnTaken: l.turnTaken,
            })),
          );

          layer.destroy();
        },
      }),
    );

    // Close button
    layer.track(
      new Button(this, {
        x: panelX + panelW - content.x - 100,
        y: panelY + panelH - 50,
        width: 100,
        label: "Close",
        onClick: () => {
          layer.destroy();
        },
      }),
    );
  }

  private repaySelectedLoan(loanTable: DataTable): void {
    if (!this.selectedLoanId) {
      const noSelectModal = new Modal(this, {
        title: "No Loan Selected",
        body: "Please select a loan from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const state = gameStore.getState();
    const loan = state.loans.find((l) => l.id === this.selectedLoanId);
    if (!loan) return;

    if (state.cash < loan.remainingBalance) {
      const errorModal = new Modal(this, {
        title: "Insufficient Funds",
        body: `You need ${formatCash(loan.remainingBalance)} to repay this loan but only have ${formatCash(state.cash)}.`,
        onOk: () => {
          errorModal.destroy();
        },
      });
      errorModal.show();
      return;
    }

    const loanId = this.selectedLoanId;
    const modal = new Modal(this, {
      title: "Repay Loan",
      body: `Repay ${formatCash(loan.remainingBalance)} in full?`,
      onOk: () => {
        const freshState = gameStore.getState();
        const repayLoan = freshState.loans.find((l) => l.id === loanId);
        if (!repayLoan) return;

        gameStore.update({
          cash: freshState.cash - repayLoan.remainingBalance,
          loans: freshState.loans.filter((l) => l.id !== loanId),
        });

        this.selectedLoanId = null;

        // Refresh loan table
        const updatedState = gameStore.getState();
        loanTable.setRows(
          updatedState.loans.map((l: Loan) => ({
            id: l.id,
            principal: l.principal,
            rate: l.interestRate,
            remaining: l.remainingBalance,
            turnTaken: l.turnTaken,
          })),
        );

        modal.destroy();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    modal.show();
  }
}
