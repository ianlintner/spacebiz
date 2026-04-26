import { getPage } from "../browser.js";
import { SftDriver } from "../driver.js";
import { isSftTestErrorShape } from "../types.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export interface ToolResult {
  [k: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

/** Obtain a driver bound to the singleton page. */
export async function driver(): Promise<SftDriver> {
  const page = await getPage();
  return new SftDriver(page);
}

/**
 * Serialize an arbitrary JSON-safe payload as the canonical MCP tool result.
 * We also include a `structuredContent` object so clients that support
 * structured tool output can consume the data without re-parsing JSON.
 */
export function ok(payload: unknown): ToolResult {
  const text = JSON.stringify(payload ?? null, null, 2);
  const structured =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : { value: payload as unknown };
  return {
    content: [{ type: "text", text }],
    structuredContent: structured,
  };
}

/**
 * Normalize the variety of errors that bubble up from `page.evaluate` into a
 * structured MCP tool failure. Preserves `SftTestError.code` in `structuredContent`.
 */
export function fail(err: unknown): ToolResult {
  // Playwright wraps thrown errors with extra context; try to recover the
  // original JSON-serialized `SftTestError` from `err.message` if possible.
  const parsed = extractSftError(err);
  if (parsed) {
    return {
      content: [
        {
          type: "text",
          text: `SftTestError[${parsed.code}]: ${parsed.message}${
            parsed.hint ? `\nhint: ${parsed.hint}` : ""
          }`,
        },
      ],
      isError: true,
      structuredContent: {
        error: {
          name: "SftTestError",
          code: parsed.code,
          message: parsed.message,
          testId: parsed.testId,
          hint: parsed.hint,
        },
      },
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
    structuredContent: {
      error: {
        name: err instanceof Error ? err.name : "Error",
        message,
      },
    },
  };
}

function extractSftError(err: unknown): {
  code: string;
  message: string;
  testId?: string;
  hint?: string;
} | null {
  if (isSftTestErrorShape(err)) {
    return {
      code: err.code,
      message: err.message,
      testId: err.testId,
      hint: err.hint,
    };
  }
  if (err instanceof Error && typeof err.message === "string") {
    // Playwright serializes the thrown object's JSON into `err.message`.
    const match = err.message.match(
      /\{[\s\S]*"name"\s*:\s*"SftTestError"[\s\S]*\}/,
    );
    if (match) {
      try {
        const obj = JSON.parse(match[0]) as Record<string, unknown>;
        if (
          obj &&
          obj.name === "SftTestError" &&
          typeof obj.code === "string"
        ) {
          return {
            code: obj.code,
            message:
              typeof obj.message === "string" ? obj.message : err.message,
            testId: typeof obj.testId === "string" ? obj.testId : undefined,
            hint: typeof obj.hint === "string" ? obj.hint : undefined,
          };
        }
      } catch {
        // fall through
      }
    }
  }
  return null;
}

/** Run a tool body and funnel errors into the MCP failure shape. */
export async function run<T>(fn: () => Promise<T>): Promise<ToolResult> {
  try {
    const result = await fn();
    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
