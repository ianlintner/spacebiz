/**
 * Vitest bridge for the RuleTester-based rule tests.
 *
 * `@typescript-eslint/rule-tester` plugs into test runners via
 * `RuleTester.afterAll` / describe / it hooks. We wire it to vitest so the
 * rule's assertions show up in the normal `npm run test` output.
 */
import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";
import { rule } from "../require-widget-testid.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("require-widget-testid", rule, {
  valid: [
    // 1. Button with a plain string literal label — no testId required.
    {
      code: `
        const btn = new Button(scene, {
          x: 0,
          y: 0,
          label: "Launch Turn",
          onClick: () => {},
        });
      `,
    },
    // 2. Button with a dynamic label but an explicit testId — OK.
    {
      code: `
        const btn = new Button(scene, {
          x: 0,
          y: 0,
          label: filter.label,
          testId: "btn-route-filter",
          onClick: () => {},
        });
      `,
    },
    // 3. Modal with an explicit testId prefix — OK.
    {
      code: `
        const modal = new Modal(scene, {
          title: "Confirm Delete",
          body: msg,
          testId: "modal-delete-route",
          onOk: () => {},
        });
      `,
    },
    // 4. Template literal with zero interpolations is effectively static — OK.
    {
      code: `
        const btn = new Button(scene, {
          x: 0,
          y: 0,
          label: \`Close\`,
          onClick: () => {},
        });
      `,
    },
    // 5. Unrelated constructor — rule should not fire.
    {
      code: `
        const x = new SomeOtherThing(scene, { label: dynamic });
      `,
    },
  ],
  invalid: [
    // 1. Button with a variable-reference label and no testId.
    {
      code: `
        const btn = new Button(scene, {
          x: 0,
          y: 0,
          label: filter.label,
          onClick: () => {},
        });
      `,
      errors: [{ messageId: "buttonDynamicLabel" }],
    },
    // 2. Button with a template literal that has interpolations.
    {
      code: `
        const btn = new Button(scene, {
          x: 0,
          y: 0,
          label: \`Buy \${ship.name}\`,
          onClick: () => {},
        });
      `,
      errors: [{ messageId: "buttonDynamicLabel" }],
    },
    // 3. Button with a function-call label — dynamic.
    {
      code: `
        const btn = new Button(scene, {
          x: 0,
          y: 0,
          label: formatLabel(ship),
          onClick: () => {},
        });
      `,
      errors: [{ messageId: "buttonDynamicLabel" }],
    },
    // 4. Modal without any testId.
    {
      code: `
        const modal = new Modal(scene, {
          title: "Confirm",
          body: "Are you sure?",
          onOk: () => {},
        });
      `,
      errors: [{ messageId: "modalMissingTestId" }],
    },
    // 5. Modal with dynamic title and no testId.
    {
      code: `
        const modal = new Modal(scene, {
          title: event.title,
          body: event.body,
          onOk: () => {},
        });
      `,
      errors: [{ messageId: "modalMissingTestId" }],
    },
  ],
});
