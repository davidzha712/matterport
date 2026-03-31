import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuditEntry,
  getAuditIssues,
  prefixFlag,
} from "./op-audit-login-metadata.mjs";

test("getAuditIssues returns no issues for complete login items", () => {
  const item = {
    category: "LOGIN",
    fields: [
      {
        label: "username",
        value: "user@example.com",
      },
    ],
    urls: [
      {
        href: "https://example.com",
      },
    ],
  };

  assert.deepEqual(getAuditIssues(item), []);
});

test("getAuditIssues flags missing username", () => {
  const item = {
    category: "LOGIN",
    fields: [
      {
        label: "username",
        value: "   ",
      },
    ],
    urls: [
      {
        href: "https://example.com",
      },
    ],
  };

  assert.deepEqual(getAuditIssues(item), ["missing username"]);
});

test("getAuditIssues flags missing website", () => {
  const item = {
    category: "LOGIN",
    fields: [
      {
        label: "username",
        value: "user@example.com",
      },
    ],
    urls: [],
  };

  assert.deepEqual(getAuditIssues(item), ["missing website"]);
});

test("buildAuditEntry keeps already-flagged titles unchanged", () => {
  const item = {
    id: "item-1",
    title: "! Existing Flag",
    vault: { name: "Personal" },
    category: "LOGIN",
    fields: [
      {
        label: "username",
        value: "",
      },
    ],
    urls: [],
  };

  assert.equal(prefixFlag("Example"), "! Example");
  assert.equal(prefixFlag("! Example"), "! Example");

  assert.deepEqual(buildAuditEntry(item), {
    id: "item-1",
    title: "! Existing Flag",
    nextTitle: "! Existing Flag",
    vault: "Personal",
    category: "LOGIN",
    issues: ["missing username", "missing website"],
    needsRename: false,
  });
});

test("getAuditIssues supports legacy item payloads with details.fields", () => {
  const item = {
    overview: {
      title: "! Advanzia",
      url: "https://www.advanzia.com",
      URLs: [
        {
          u: "https://www.advanzia.com",
        },
      ],
    },
    details: {
      fields: [
        {
          name: "username",
          designation: "username",
          value: "",
        },
        {
          name: "password",
          designation: "password",
          value: "secret",
        },
      ],
    },
  };

  assert.deepEqual(getAuditIssues(item), ["missing username"]);
});
