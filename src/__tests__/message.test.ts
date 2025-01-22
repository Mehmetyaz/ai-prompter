import { MessageBuilder, msg } from "../index";

const indent = "----";

MessageBuilder.setGlobalIndent(indent);

describe("MessageBuilder", () => {
  let messageBuilder: MessageBuilder;

  beforeEach(() => {
    messageBuilder = new MessageBuilder();
  });

  describe("add", () => {
    it("should add string message", () => {
      messageBuilder.add("Hello");
      expect(messageBuilder.build()).toBe("Hello");
    });

    it("should add multiple messages", () => {
      messageBuilder.add("Hello");
      messageBuilder.add("World");
      expect(messageBuilder.build()).toBe("Hello\nWorld");
    });

    it("should add nested MessageBuilder", () => {
      const nested = new MessageBuilder();
      nested.add("Nested Message");
      messageBuilder.add(nested);
      expect(messageBuilder.build()).toBe(`${indent}Nested Message`);
    });

    it("should handle empty string", () => {
      messageBuilder.add("");
      expect(messageBuilder.build()).toBe("");
    });

    it("should handle multiple empty strings", () => {
      messageBuilder.add("");
      messageBuilder.add("");
      expect(messageBuilder.build()).toBe("\n");
    });

    it("should handle special characters", () => {
      messageBuilder.add("Hello\tWorld");
      messageBuilder.add("Line\r\nBreak");
      expect(messageBuilder.build()).toBe("Hello\tWorld\nLine\r\nBreak");
    });

    it("should handle deeply nested MessageBuilders", () => {
      const level1 = new MessageBuilder();
      const level2 = new MessageBuilder();
      const level3 = new MessageBuilder();

      level3.add("Deep Message");
      level2.add(level3);
      level1.add(level2);
      messageBuilder.add(level1);

      expect(messageBuilder.build()).toBe(`${indent.repeat(3)}Deep Message`);
    });
  });

  describe("addKv", () => {
    it("should add key-value pair with string value", () => {
      messageBuilder.addKv("name", "John");
      expect(messageBuilder.build()).toBe("name: John");
    });

    it("should add key-value pair with MessageBuilder value", () => {
      const nestedMsg = new MessageBuilder();
      nestedMsg.add("Nested Value");
      messageBuilder.addKv("data", nestedMsg);
      expect(messageBuilder.build()).toBe(`data:\n${indent}Nested Value`);
    });

    it("should handle empty key", () => {
      messageBuilder.addKv("", "value");
      expect(messageBuilder.build()).toBe(": value");
    });

    it("should handle empty value", () => {
      messageBuilder.addKv("key", "");
      expect(messageBuilder.build()).toBe("key: ");
    });

    it("should handle number values", () => {
      messageBuilder.addKv("count", 42);
      messageBuilder.addKv("price", 99.99);
      expect(messageBuilder.build()).toBe("count: 42\nprice: 99.99");
    });

    it("should handle boolean values", () => {
      messageBuilder.addKv("isActive", true);
      messageBuilder.addKv("isDeleted", false);
      expect(messageBuilder.build()).toBe("isActive: true\nisDeleted: false");
    });

    it("should handle multiple nested MessageBuilder values", () => {
      const address = new MessageBuilder();
      address.addKv("street", "123 Main St");
      address.addKv("city", "New York");

      const contact = new MessageBuilder();
      contact.addKv("email", "test@example.com");
      contact.addKv("address", address);

      messageBuilder.addKv("contact", contact);
      expect(messageBuilder.build()).toBe(
        `contact:
${indent}email: test@example.com
${indent}address:
${indent.repeat(2)}street: 123 Main St
${indent.repeat(2)}city: New York`
      );
    });
  });

  describe("build", () => {
    it("should build without intent", () => {
      messageBuilder.add("Line 1");
      messageBuilder.add("Line 2");
      expect(messageBuilder.build(false)).toBe("Line 1\nLine 2");
    });

    it("should build with intent", () => {
      messageBuilder.add("Line 1");
      messageBuilder.add("Line 2");
      expect(messageBuilder.build(true)).toBe(
        `${indent}Line 1\n${indent}Line 2`
      );
    });

    it("should handle mixed content with intent", () => {
      const nested = new MessageBuilder();
      nested.add("Nested");

      messageBuilder.add("First");
      messageBuilder.addKv("key", "value");
      messageBuilder.add(nested);
      messageBuilder.add("Last");

      expect(messageBuilder.build(true)).toBe(
        `${indent}First\n${indent}key: value\n${indent.repeat(
          2
        )}Nested\n${indent}Last`
      );
    });

    it("should preserve empty lines", () => {
      messageBuilder.add("First");
      messageBuilder.add("");
      messageBuilder.add("Last");
      expect(messageBuilder.build()).toBe("First\n\nLast");
    });
  });

  describe("msg function", () => {
    it("should create empty MessageBuilder", () => {
      const message = msg();
      expect(message.build()).toBe("");
    });

    it("should create MessageBuilder with initial string", () => {
      const message = msg("Initial");
      expect(message.build()).toBe("Initial");
    });

    it("should create MessageBuilder with initial MessageBuilder", () => {
      const initial = new MessageBuilder();
      initial.add("Initial");
      const message = msg(initial);
      expect(message.build()).toBe(`${indent}Initial`);
    });

    it("should handle undefined input", () => {
      const message = msg(undefined);
      expect(message.build()).toBe("");
    });

    it("should chain multiple operations after msg", () => {
      const message = msg("First").add("Second").addKv("key", "value");
      expect(message.build()).toBe("First\nSecond\nkey: value");
    });

    it("should handle nested msg calls", () => {
      const inner = msg("Inner Content");
      const outer = msg(inner).add("Outer Content");
      expect(outer.build()).toBe(`${indent}Inner Content\nOuter Content`);
    });
  });

  describe("edge cases", () => {
    it("should handle very long messages", () => {
      const longString = "a".repeat(1000);
      messageBuilder.add(longString);
      expect(messageBuilder.build()).toBe(longString);
    });

    it("should handle multiple levels of nesting with mixed content", () => {
      const level1 = msg("L1");
      const level2 = msg(level1).addKv("L2", "value");
      const level3 = msg(level2).add("L3");

      expect(level3.build()).toBe(
        `${indent.repeat(2)}L1\n${indent}L2: value\nL3`
      );
    });

    it("should handle complex nested structure", () => {
      const data = new MessageBuilder();
      data.addKv("id", 1);
      data.addKv("name", "Test");

      const nested = new MessageBuilder();
      nested.add("Header");
      nested.add(data);
      nested.add("Footer");

      messageBuilder.addKv("result", nested);

      expect(messageBuilder.build()).toBe(
        `result:
${indent}Header
${indent.repeat(2)}id: 1
${indent.repeat(2)}name: Test
${indent}Footer`
      );
    });
  });

  describe("template support", () => {
    it("should handle simple template", () => {
      const message = msg("Hello {{name}}!", { name: "John" });
      expect(message.build()).toBe("Hello John!");
    });

    it("should handle nested templates", () => {
      const nested = msg("I am {{age}}", { age: 25 });
      const message = msg("Name: {{name}}", { name: "John" });
      message.add(nested);
      expect(message.build()).toBe(`Name: John\n${indent}I am 25`);
    });

    it("should handle inherited args in nested builders", () => {
      const message = msg("Name: {{name}}", { name: "John", age: 25 });
      message.add(msg("Age: {{age}}"));
      expect(message.build()).toBe(`Name: John\n${indent}Age: 25`);
    });

    it("should handle complex template values", () => {
      const message = msg("Data: {{data}}", {
        data: { name: "John", age: 25 },
      });
      expect(message.build()).toBe('Data: {"name":"John","age":25}');
    });

    it("should ignore single braces", () => {
      const message = msg("Hello {name}!", { name: "John" });
      expect(message.build()).toBe("Hello {name}!");
    });

    it("should handle multiple templates in one string", () => {
      const message = msg("{{greeting}} {{name}}!", {
        greeting: "Hello",
        name: "John",
      });
      expect(message.build()).toBe("Hello John!");
    });

    it("should leave template as is if arg not provided", () => {
      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const message = msg("Hello {{name}}!");
      expect(message.build()).toBe("Hello {{name}}!");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Template argument "name" not found in args'
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe("JSON serialization", () => {
    it("should serialize to JSON", () => {
      const message = msg("Hello");
      message.add("World");
      expect(JSON.stringify({ msg: message })).toBe('{"msg":"Hello\\nWorld"}');
    });

    it("should serialize nested builders", () => {
      const nested = msg("Nested");
      const message = msg("Parent").add(nested);
      expect(JSON.stringify({ msg: message })).toBe(
        `{"msg":"Parent\\n${indent}Nested"}`
      );
    });
  });
});
