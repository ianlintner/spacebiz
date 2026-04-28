import * as Phaser from "phaser";
import { DataTable, getTheme } from "@spacebiz/ui";
import type { ColumnDef } from "@spacebiz/ui";

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Ship", width: 180 },
  { key: "class", label: "Class", width: 120 },
  { key: "credits", label: "Credits", width: 120, align: "right" },
];

const ROWS: Record<string, unknown>[] = [
  { name: "Aurora", class: "Hauler", credits: 12_400 },
  { name: "Bellatrix", class: "Frigate", credits: 8_900 },
  { name: "Cassiopeia", class: "Tanker", credits: 21_050 },
  { name: "Draco", class: "Hauler", credits: 4_200 },
];

class TableScene extends Phaser.Scene {
  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.bgDeep);

    const table = new DataTable(this, {
      x: 80,
      y: 80,
      width: 480,
      height: 320,
      columns: COLUMNS,
    });
    this.add.existing(table);
    table.setRows(ROWS);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  scene: [TableScene],
});
