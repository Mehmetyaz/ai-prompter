# Prompt Builder

A flexible and powerful TypeScript library for building structured chat messages and prompts. Perfect for applications working with AI chat models, command-line interfaces, or any scenario requiring structured message building.

## Table of Contents

1. [Core Concepts](#core-concepts)
   - [Message Builder](#message-builder)
   - [Prompt Builder](#prompt-builder)
2. [Installation](#installation)
3. [Message Builder Guide](#message-builder-guide)
   - [Creating Messages](#creating-messages)
   - [Adding Content](#adding-content)
   - [Key-Value Pairs](#key-value-pairs)
   - [Nested Structures](#nested-structures)
   - [Template Variables](#template-variables)
   - [Async Operations](#async-operations)
   - [Indentation Control](#indentation-control)
4. [Prompt Builder Guide](#prompt-builder-guide)
   - [Message Types](#message-types)
   - [Building Messages](#building-messages)
   - [Integration](#integration)
5. [API Reference](#api-reference)
6. [Examples](#examples)

## Core Concepts

### Message Builder

MessageBuilder is the foundation of this library. It's responsible for constructing structured text content with features like:

- Building multi-line messages
- Formatting key-value pairs
- Creating nested structures with automatic indentation
- Template variable substitution
- Async content building

Think of MessageBuilder as a sophisticated string builder that understands structure and formatting.

### Prompt Builder

PromptBuilder is a higher-level abstraction built on top of MessageBuilder. It's designed specifically for chat-like interactions and AI prompts. It:

- Manages different types of messages (system, user, assistant)
- Maintains message order and roles
- Provides specialized output formats for AI models
- Handles context and placeholder management

Think of PromptBuilder as a conversation manager that uses MessageBuilder to format individual messages.

## Installation

```bash
npm install prompt-builder
# or
yarn add prompt-builder
```

## Message Builder Guide

### Creating Messages

```typescript
import { msg, MessageBuilder } from "prompt-builder";

// Simple message
const message = msg("Hello World");

// With initial args
const messageWithArgs = msg("Hello {{name}}", { name: "John" });

// Custom instance
const customMessage = new MessageBuilder("   "); // custom indent
```

### Adding Content

```typescript
const message = msg();

// Simple additions
message.add("Line 1");
message.add("Line 2");
message.build();
// Result:
// Line 1
// Line 2

const message = msg();
// Chaining
message.add("First line").add("Second line");
message.build();
// Result:
// First line
// Second line

// Nested content
message.add("User Profile:");
message.add(msg().addKv("name", "John").addKv("age", 30));
message.build();
// Result:
//
// User Profile:
//   name: John
//   age: 30

// Function-based nested content

const message = msg("Static content");
message.add((msg) => {
  msg.add("Dynamic content");
});
message.build();
// Result:
// Static content
//   Dynamic content

// Async content

const message = msg("Static content");
await message.addAsync(async (msg) => {
  const data = await fetchData();
  msg.addKv("result", data);
});
message.build();
// Result:
// Static content
//   result: ...
```

### Key-Value Pairs

```typescript
const message = msg();

// Simple key-value
message.addKv("name", "John");
message.build();
// Result:
//
// name: John

// Multiple pairs
const message = msg();
message.addKv("age", 30).addKv("city", "New York");
message.build();
// Result:
//
// age: 30
// city: New York

// Complex values
message.addKv("data", { x: 1, y: 2 });
message.build();
// Result:
//
// data: {"x":1,"y":2}
```

### Nested Structures

```typescript
const message = msg();

message.add("User Profile:");
message.addKv("personal", (nested) => {
  nested.addKv("name", "John");
  nested.addKv("age", 30);
  nested.addKv("address", (deeper) => {
    deeper.addKv("city", "New York");
    deeper.addKv("country", "USA");
  });
});
message.build();
// Result:
//
// User Profile:
// personal:
//    name: John
//    age: 30
//    address:
//       city: New York
//       country: USA
```

For nesting, callback functions are not required:

```typescript
const message = msg();

message.add("User Profile:");
message.addKv(
  "personal",
  msg()
    .addKv("name", "John")
    .addKv("age", 30)
    .addKv("address", msg().addKv("city", "New York").addKv("country", "USA"))
);
message.build();
// Result:
//
// User Profile:
// personal:
//    name: John
//    age: 30
//    address:
//       city: New York
//       country: USA
```

### Template Variables

```typescript
// Global args
const message = msg("Hello {{name}}!", {
  name: "John",
  age: 30,
});

// Using args in nested structures
message.addKv("profile", (nested) => {
  nested.addKv("greeting", "{{name}} is {{age}} years old");
});
message.build();
// Result:
//
// Hello John!
// profile:
//   greeting: John is 30 years old

// Inheriting args
const childMsg = msg("Child of {{name}}");
message.add(childMsg); // inherits parent's args
message.build();
// Result:
//
// Hello John!
// profile:
//    greeting: John is 30 years old
// Child of John
```

### Async Operations

```typescript
const message = msg();

// Adding async content
await message.addAsync(async (msg) => {
  const data = await fetchData();
  msg.addKv("result", data);
});

// Nested async operations
await message.addAsync(async (msg) => {
  msg.add("Processing...");
  await msg.addAsync(async (nested) => {
    const status = await checkStatus();
    nested.addKv("status", status);
  });
});
```

### Indentation Control

```typescript
// Global indentation
MessageBuilder.setGlobalIndent("    "); // 4 spaces

// Instance-specific
const message = new MessageBuilder("  "); // 2 spaces

// Building with/without additional indentation
message.build(true); // with additional indentation
message.build(false); // without indentation

// Custom indent for specific block
new MessageBuilder("\t"); // tab indentation
```

## Prompt Builder Guide

### Message Types

PromptBuilder supports three types of messages:

1. System Messages: Instructions or context for AI models
2. User Messages: Input from users
3. Assistant Messages: Responses from AI or system

```typescript
const prompt = new PromptBuilder();

// System messages become context
prompt.systemMessage("You are a helpful assistant");

// User and assistant messages form the conversation
prompt.userMessage("Hello!");
prompt.assistantMessage("Hi there!");
```

### Building Messages

```typescript
const prompt = new PromptBuilder();

// Simple messages
prompt.userMessage("Basic message");

// Structured messages
prompt.userMessage((msg) => {
  msg.add("Complex message:");
  msg.addKv("data", { type: "user_input" });
});

// or

const message = msg();
message.add("Complex message:");
message.addKv("data", { type: "user_input" });
prompt.userMessage(message);

// With placeholders
prompt.userMessage("Question here", "question");
prompt.assistantMessage("Answer here", "answer");

// Build all messages
const messages = prompt.build();
// [
//   { role: "user", content: "..." },
//   { role: "assistant", content: "..." }
// ]
```

### Integration

```typescript
const prompt = new PromptBuilder();

// Setup system behavior
prompt.systemMessage(
  "You are a code reviewer. Your working will be similar to this:"
);

const exampleUserReq = `{
  "code": "function x() {}",
  "request": "Review the code and find any security issues."
}`;

const userRequestPlaceholders = `{
  "code": "<code-will-be-here>",
  "request": "<request-will-be-here>"
}`;

prompt.userMessage(exampleUserReq, userRequestPlaceholders);

const exampleReview = `{
  "review": "This function is empty."
}`;

const reviewPlaceholders = `Review: {
  "review": "<review-will-be-here>"
}`;

prompt.assistantMessage(exampleReview, reviewPlaceholders);

prompt.systemMessage("Focus on requested things.");

// Build for ChatGPT Assistant
const { messages, context } = prompt.buildForAssistant();
// Result:
//
// context:
// You are a code reviewer. Your working will be similar to this:
// Request: {
//   "code": "<code-will-be-here>",
//   "request": "<request-will-be-here>"
// }
// Review: {
//   "review": "<review-will-be-here>"
// }
// Focus on requested things.
//
// messages: [
//   { role: "user", content: "{ code: "function x() {}", request: "Review the code and find any security issues." }"},
//   { role: "assistant", content: "{ review: "This function is empty." }"}
// ]

// Build for standard chat or claude etc.
const messages = prompt.build();
// Result:
// [
//   { role: "system", content: "You are a code reviewer. Your working will be similar to this:" },
//   { role: "user", content: "{ code: "function x() {}", request: "Review the code and find any security issues." }"},
//   { role: "assistant", content: "{ review: "This function is empty." }"}
//   { role: "system", content: "Focus on requested things." }
// ]
```

## API Reference

### Common Types

`type WithMessageBuilder = (message: MessageBuilder) => void;` - A function that takes a MessageBuilder and returns void.

`type WithMessageBuilderAsync = (message: MessageBuilder) => Promise<void>;` - A function that takes a MessageBuilder and returns a Promise that resolves to void.

`type MessageInput = string | number | boolean | MessageBuilder;` - A message can be a string, number, boolean, or a MessageBuilder.

### PromptBuilder

- `constructor(args?: Record<string, any>)` - Create a new prompt builder with optional template variables

#### System Messages

- `systemMessage(message: MessageInput | WithMessageBuilder)` - Add a system message
- `systemMessageAsync(fn: WithMessageBuilderAsync)` - Add a system message asynchronously

#### User Messages

- `userMessage(message: MessageInput | WithMessageBuilder)` - Add a user message
- `userMessageAsync(fn: WithMessageBuilderAsync)` - Add a user message asynchronously

#### Assistant Messages

- `assistantMessage(message: MessageInput | WithMessageBuilder)` - Add an assistant message
- `assistantMessageAsync(fn: WithMessageBuilderAsync)` - Add an assistant message asynchronously

#### Build

- `build()` - Build all messages
- `buildForAssistant()` - Build messages optimized for AI assistant format

### MessageBuilder

- `constructor(indent?: string)` - Create a new message builder with optional indentation

#### Add a message

- `add(message: MessageInput | WithMessageBuilder)` - Add a message
- `addAsync(fn: WithMessageBuilderAsync)` - Add a message asynchronously

#### Add a key-value pair

- `addKv(key: string, value: any)` - Add a key-value pair
- `addKvAsync(key: string, fn: WithMessageBuilderAsync)` - Add a key-value pair asynchronously

#### Build

- `build(withIndent?: boolean)` - Build the message
- `static setGlobalIndent(indent: string)` - Set global indentation

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
