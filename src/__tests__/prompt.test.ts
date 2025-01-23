import { PromptBuilder } from "../index";

declare global {
  namespace AIPrompter {
    interface BuildingPrompt {
      tags?: string[];
      priority?: number;
      category?: string;
    }
  }
}

describe("PromptBuilder", () => {
  let promptBuilder: PromptBuilder;

  beforeEach(() => {
    promptBuilder = new PromptBuilder();
  });

  describe("message adding", () => {
    it("should add user message", () => {
      promptBuilder.userMessage("Hello");
      const messages = promptBuilder.build();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: "user",
        content: "Hello",
      });
    });

    it("should add assistant message", () => {
      promptBuilder.assistantMessage("Hi there");
      const messages = promptBuilder.build();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: "assistant",
        content: "Hi there",
      });
    });

    it("should add system message", () => {
      promptBuilder.systemMessage("System instruction");
      promptBuilder.userMessage("User msg", {
        placeholder: "<user_placeholder>",
      });
      promptBuilder.assistantMessage("Asst msg", {
        placeholder: "<asst_placeholder>",
      });

      const { messages, context } = promptBuilder.buildForAssistant();

      expect(messages).toHaveLength(2); // user and assistant

      expect(context?.includes("<user_placeholder>")).toBe(true);
      expect(context?.includes("<asst_placeholder>")).toBe(true);
    });

    it("should add multiple messages in sequence", () => {
      promptBuilder.systemMessage("System msg");
      promptBuilder.userMessage("User msg");
      promptBuilder.assistantMessage("Assistant msg");

      const messages = promptBuilder.build();
      expect(messages).toHaveLength(3);
      expect(messages.map((m) => m.role)).toEqual([
        "system",
        "user",
        "assistant",
      ]);
    });
  });

  describe("buildForAssistant", () => {
    it("should build messages for assistant without system messages", () => {
      promptBuilder.userMessage("User msg");
      promptBuilder.assistantMessage("Assistant msg");

      const result = promptBuilder.buildForAssistant();
      expect(result.messages).toHaveLength(2);
      expect(result.context).toBeUndefined();
    });

    it("should build messages with system context", () => {
      promptBuilder.systemMessage("System instruction");
      promptBuilder.userMessage("User msg");

      const result = promptBuilder.buildForAssistant();
      expect(result.messages).toHaveLength(1);
      expect(result.context).toBe("System instruction");
    });

    it("should handle multiple system messages and placeholders", () => {
      promptBuilder.systemMessage("System 1");
      promptBuilder.systemMessage("System 2");
      promptBuilder.userMessage("User msg", { placeholder: "<placeholder1>" });

      const result = promptBuilder.buildForAssistant();
      expect(result.messages).toHaveLength(1);
      expect(result.context).toBe("System 1\nSystem 2\n<placeholder1>");
      expect(result.messages[0]).toEqual({
        role: "user",
        content: "User msg",
      });
    });
  });

  describe("build", () => {
    it("should return all messages in order", () => {
      promptBuilder.systemMessage("System msg");
      promptBuilder.userMessage("User msg");
      promptBuilder.assistantMessage("Assistant msg");

      const messages = promptBuilder.build();
      expect(messages).toHaveLength(3);
      expect(messages).toEqual([
        { role: "system", content: "System msg" },
        { role: "user", content: "User msg" },
        { role: "assistant", content: "Assistant msg" },
      ]);
    });
  });

  describe("function usage in messages", () => {
    it("should handle function-based message building", () => {
      promptBuilder.userMessage((msg) => {
        msg.add("Hello");
        msg.add("World");
      });

      const messages = promptBuilder.build();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello\nWorld");
    });

    it("should handle key-value pairs in messages", () => {
      promptBuilder.userMessage((msg) => {
        msg.addKv("name", "John");
        msg.addKv("age", 30);
      });

      const messages = promptBuilder.build();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain("name:");
      expect(messages[0].content).toContain("John");
      expect(messages[0].content).toContain("age:");
      expect(messages[0].content).toContain("30");
    });

    it("should handle nested message builders", () => {
      promptBuilder.userMessage((msg) => {
        msg.add("User Info:");
        msg.addKv("details", (nested) => {
          nested.addKv("name", "John");
          nested.addKv("age", 30);
        });
      });

      const messages = promptBuilder.build();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain("User Info:");
      expect(messages[0].content).toContain("details:");
      expect(messages[0].content).toContain("name:");
      expect(messages[0].content).toContain("John");
    });

    it("should work with async message builders", async () => {
      await promptBuilder.userMessageAsync(async (msg) => {
        msg.add("Async");
        msg.add("Message");
      });

      const messages = promptBuilder.build();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Async\nMessage");
    });

    it("should throw error when async function is used with non-async method", () => {
      expect(() => {
        promptBuilder.userMessage(async (msg) => {
          msg.add("This will fail");
        });
      }).toThrow(
        "Async function cannot be used with non-async message method. Use userMessageAsync instead."
      );
      expect(() => {
        promptBuilder.systemMessage(async (msg) => {
          msg.add("This will fail");
        });
      }).toThrow(
        "Async function cannot be used with non-async message method. Use systemMessageAsync instead."
      );
      expect(() => {
        promptBuilder.assistantMessage(async (msg) => {
          msg.add("This will fail");
        });
      }).toThrow(
        "Async function cannot be used with non-async message method. Use assistantMessageAsync instead."
      );
    });
  });

  describe("message filtering and extra data", () => {
    beforeEach(() => {
      promptBuilder = new PromptBuilder();
    });

    it("should filter messages based on tags", () => {
      promptBuilder.systemMessage("System 1", {
        extra: { tags: ["important"] },
      });
      promptBuilder.systemMessage("System 2", {
        extra: { tags: ["optional"] },
      });
      promptBuilder.userMessage("User 1", { extra: { tags: ["important"] } });
      promptBuilder.userMessage("User 2", { extra: { tags: ["optional"] } });

      const result = promptBuilder.buildForAssistant(
        (msg) => msg.tags?.includes("important") ?? false
      );

      expect(result.messages).toHaveLength(1); // Only User 1
      expect(result.context).toBe("System 1"); // Only System 1
    });

    it("should handle custom extra data", () => {
      promptBuilder.systemMessage("High priority", {
        extra: { priority: 1, category: "setup" },
      });
      promptBuilder.userMessage("Medium priority", {
        extra: { priority: 2, category: "question" },
      });

      const result = promptBuilder.buildForAssistant(
        (msg) => (msg.priority as number) < 2
      );

      expect(result.messages).toHaveLength(0); // No user messages
      expect(result.context).toBe("High priority"); // Only high priority system message
    });

    it("should handle both tags and custom extra data", () => {
      promptBuilder.systemMessage("Important System", {
        extra: { tags: ["system", "important"], priority: 1 },
      });
      promptBuilder.userMessage("Important User", {
        extra: { tags: ["user", "important"], priority: 2 },
      });
      promptBuilder.assistantMessage("Optional Assistant", {
        extra: { tags: ["assistant", "optional"], priority: 3 },
      });

      const result = promptBuilder.buildForAssistant((msg) => {
        if (msg.role === "system") return true;
        return msg.priority !== undefined && msg.priority <= 2;
      });

      expect(result.messages).toHaveLength(1); // Only Important User
      expect(result.context).toBe("Important System"); // Only Important System
    });

    it("should handle undefined extra data", () => {
      promptBuilder.systemMessage("System");
      promptBuilder.userMessage("User", { extra: { tags: ["important"] } });

      const result = promptBuilder.buildForAssistant(
        (msg) => msg.tags?.includes("important") ?? false
      );

      expect(result.messages).toHaveLength(1); // Only tagged user message
      expect(result.context).toBe(undefined); // No system message (didn't have important tag)
    });

    it("should handle complex filtering logic", () => {
      promptBuilder.systemMessage("Setup", {
        extra: {
          tags: ["system", "setup"],
          priority: 1,
          category: "config",
        },
      });

      promptBuilder.userMessage("Question", {
        extra: {
          tags: ["user", "question"],
          priority: 2,
          category: "support",
        },
      });

      promptBuilder.assistantMessage("Answer", {
        extra: {
          tags: ["assistant", "answer"],
          priority: 2,
          category: "support",
        },
      });

      const result = promptBuilder.buildForAssistant((msg) => {
        // Include all system messages
        if (msg.role === "system") return true;

        // For other messages, check category and priority
        return msg.category === "support" && (msg.priority as number) <= 2;
      });

      expect(result.messages).toHaveLength(2); // Question and Answer
      expect(result.context).toBe("Setup"); // Setup message
    });
  });
});
