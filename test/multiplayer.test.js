const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCode, generateCode } = require("../server");

test("normalizes room codes", () => {
  assert.equal(normalizeCode(" ab-cd "), "ABCD");
  assert.equal(normalizeCode("a1b2c3"), "ABC");
});

test("generates four-character room codes using allowed letters", () => {
  const code = generateCode();
  assert.match(code, /^[A-HJ-NP-Z]{4}$/);
});
