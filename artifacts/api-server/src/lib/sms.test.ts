import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { _internals } from "./sms";

const { makeMessageId, xmlEscape, phoneForNikita, extractTag, STATUS_DESCRIPTIONS } = _internals;

describe("sms / Nikita helpers", () => {
  describe("makeMessageId", () => {
    it("возвращает строку до 12 символов", () => {
      const id = makeMessageId();
      assert.ok(id.length > 0 && id.length <= 12, `len=${id.length}`);
    });
    it("уникальный между вызовами", () => {
      const a = makeMessageId();
      const b = makeMessageId();
      assert.notEqual(a, b);
    });
  });

  describe("xmlEscape", () => {
    it("экранирует &, <, >, кавычки", () => {
      assert.equal(xmlEscape("a & b"), "a &amp; b");
      assert.equal(xmlEscape("<tag>"), "&lt;tag&gt;");
      assert.equal(xmlEscape('"q" & \'a\''), "&quot;q&quot; &amp; &apos;a&apos;");
    });
    it("сохраняет обычный текст без изменений", () => {
      assert.equal(xmlEscape("Привет 123"), "Привет 123");
    });
  });

  describe("phoneForNikita", () => {
    it("убирает + и нецифровые символы", () => {
      assert.equal(phoneForNikita("+996 (700) 123-456"), "996700123456");
    });
    it("работает с номером без +", () => {
      assert.equal(phoneForNikita("0700123456"), "0700123456");
    });
  });

  describe("extractTag", () => {
    it("извлекает значение тега", () => {
      const xml = "<response><status>0</status><id>ABC</id></response>";
      assert.equal(extractTag(xml, "status"), "0");
      assert.equal(extractTag(xml, "id"), "ABC");
    });
    it("возвращает null если тег не найден", () => {
      assert.equal(extractTag("<x>1</x>", "y"), null);
    });
    it("регистронезависимый", () => {
      assert.equal(extractTag("<Status>5</Status>", "status"), "5");
    });
  });

  describe("STATUS_DESCRIPTIONS", () => {
    it("содержит описание для status=0 (успех)", () => {
      assert.match(STATUS_DESCRIPTIONS["0"], /принято/i);
    });
    it("содержит описание для status=11 (тестовый режим)", () => {
      assert.match(STATUS_DESCRIPTIONS["11"], /тест/i);
    });
  });
});
