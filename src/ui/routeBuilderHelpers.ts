import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeValue } from "../data/types.ts";

export const CARGO_VALUES = Object.values(CargoType) as CargoTypeValue[];

export function getInitialCargoIndex(
  initialCargoType: CargoTypeValue | undefined,
): number {
  if (!initialCargoType) return 0;
  const index = CARGO_VALUES.findIndex(
    (cargoType) => cargoType === initialCargoType,
  );
  return index >= 0 ? index : 0;
}

export function getCargoAtIndex(index: number): CargoTypeValue {
  const cargo = CARGO_VALUES[index];
  if (!cargo) {
    throw new Error(
      `Invalid cargoIndex ${index} (CARGO_VALUES.length=${CARGO_VALUES.length})`,
    );
  }
  return cargo;
}
