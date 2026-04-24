/**
 * ESLint rule: sft/require-widget-testid
 *
 * Enforces an explicit `testId` on `Button` and `Modal` widget instantiations
 * whose behavior would otherwise fall back to auto-deriving a QA slug from
 * dynamic content. When the label/title is a dynamic expression (variable,
 * template literal, call expression, etc.) the slug is unstable across runs
 * and breaks QA automation.
 *
 * Rules:
 *  - `new Button(scene, { label: <non-string-literal>, ... })` must include a
 *    `testId: string` property in the config object.
 *  - `new Modal(scene, { ... })` must always include a `testId: string`
 *    property in the config object (Modal uses testId as a prefix for its
 *    inner button testIds, so a stable prefix is mandatory for QA).
 *
 * The rule is deliberately not auto-fixable: the developer needs to pick a
 * semantically meaningful id (e.g. `testId: "btn-launch-turn"`).
 */
import type { TSESTree, TSESLint } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

type MessageIds = "buttonDynamicLabel" | "modalMissingTestId";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/spacebiz/star-freight-tycoon/blob/main/tools/eslint-rules/${name}.ts`,
);

function isStringLiteral(node: TSESTree.Node | null | undefined): boolean {
  if (!node) return false;
  // Plain string literal: { label: "Hello" }
  if (node.type === "Literal" && typeof node.value === "string") {
    return true;
  }
  // Template literal with no interpolations is effectively a string literal.
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return true;
  }
  return false;
}

function findProperty(
  obj: TSESTree.ObjectExpression,
  name: string,
): TSESTree.Property | null {
  for (const prop of obj.properties) {
    if (
      prop.type === "Property" &&
      !prop.computed &&
      ((prop.key.type === "Identifier" && prop.key.name === name) ||
        (prop.key.type === "Literal" && prop.key.value === name))
    ) {
      return prop;
    }
  }
  return null;
}

export const rule: TSESLint.RuleModule<MessageIds, []> = createRule<
  [],
  MessageIds
>({
  name: "require-widget-testid",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require explicit testId on Button (dynamic label) and Modal widgets so QA automation has stable selectors.",
    },
    schema: [],
    messages: {
      buttonDynamicLabel:
        'Dynamic label requires explicit testId — QA slug would be unstable. Add `testId: "btn-..."` to the config.',
      modalMissingTestId:
        'Modal requires an explicit testId prefix for QA automation. Add `testId: "modal-..."` to the config.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type !== "Identifier") return;
        const name = node.callee.name;
        if (name !== "Button" && name !== "Modal") return;

        // Widget constructors are `new Widget(scene, config)` — config is arg 1.
        const configArg = node.arguments[1];
        if (!configArg || configArg.type !== "ObjectExpression") return;

        const testIdProp = findProperty(configArg, "testId");

        if (name === "Modal") {
          if (!testIdProp) {
            context.report({
              node: configArg,
              messageId: "modalMissingTestId",
            });
          }
          return;
        }

        // Button case: only flag when testId is absent AND label is dynamic.
        if (testIdProp) return;

        const labelProp = findProperty(configArg, "label");
        // If there's no label at all, nothing to slug from — skip.
        if (!labelProp) return;

        const labelValue =
          labelProp.value.type === "AssignmentPattern"
            ? labelProp.value.right
            : labelProp.value;

        if (!isStringLiteral(labelValue)) {
          context.report({
            node: configArg,
            messageId: "buttonDynamicLabel",
          });
        }
      },
    };
  },
});

export default rule;
