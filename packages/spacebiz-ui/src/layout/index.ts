export { HSizer } from "./HSizer.ts";
export type { HSizerConfig } from "./HSizer.ts";

export { VSizer } from "./VSizer.ts";
export type { VSizerConfig } from "./VSizer.ts";

export { GridSizer } from "./GridSizer.ts";
export type { GridSizerConfig } from "./GridSizer.ts";

export { FixWidthSizer } from "./FixWidthSizer.ts";
export type { FixWidthSizerConfig } from "./FixWidthSizer.ts";

export { Anchor } from "./Anchor.ts";
export type { AnchorConfig } from "./Anchor.ts";

export { ResizeHost, useResize } from "./ResizeHost.ts";

export type {
  AnchorFill,
  AnchorPosition,
  GridChildOptions,
  HAlign,
  Insets,
  Justify,
  Resizable,
  SizerChildOptions,
  VAlign,
} from "./types.ts";

// Pure math helpers (also re-exported for advanced use / testing).
export { computeFlex, alignCross } from "./flexMath.ts";
export type { FlexInput, FlexResult } from "./flexMath.ts";

export { placeGrid, trackOffset, spanSize } from "./gridMath.ts";
export type {
  GridChildSpec,
  GridInput,
  GridResult,
  GridCellPlacement,
} from "./gridMath.ts";

export { computeWrap } from "./wrapMath.ts";
export type { WrapChildSpec, WrapInput, WrapResult } from "./wrapMath.ts";

export { computeAnchor } from "./anchorMath.ts";
export type { AnchorComputeInput, AnchorComputeResult } from "./anchorMath.ts";
