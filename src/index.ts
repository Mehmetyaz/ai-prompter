export * from "./types";

export type ThreadMessageRole = "assistant" | "user";
export type ChatMessageRole = ThreadMessageRole | "system";

export interface ChatMessage extends Omit<ThreadMessage, "role"> {
  role: ChatMessageRole;
  placeholder?: string;
}

export interface ThreadMessage {
  role: ThreadMessageRole;
  content: string;
}

type WithMessageBuilder = (message: MessageBuilder) => void;
type WithMessageBuilderAsync = (message: MessageBuilder) => Promise<void>;

type MessageInput = string | number | boolean | MessageBuilder;

type _Input = MessageInput | WithMessageBuilder | WithMessageBuilderAsync;

type MessageFilter = (
  message: {
    role: ChatMessageRole;
    content: string;
  } & AIPrompter.BuildingPrompt
) => Boolean;

export class PromptBuilder {
  constructor(
    public args: {
      [key: string]: any;
    } = {}
  ) {}

  private _messages: ({
    placeholder?: string;
    tags?: string[];
    role: ChatMessageRole;
    content: MessageInput;
  } & AIPrompter.BuildingPrompt)[] = [];

  _push(
    message: MessageInput | WithMessageBuilder,
    role: ChatMessageRole,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder {
    if (typeof message === "function") {
      if (isAsyncFunction(message)) {
        throw new Error(
          `Async function cannot be used with non-async message method. Use ${role}MessageAsync instead.`
        );
      }
      const _message = msg(undefined, this.args);

      message(_message);

      this._messages.push({
        role,
        content: _message,
        placeholder: options?.placeholder,
        ...options?.extra,
      });
      return this;
    } else if (message instanceof MessageBuilder) {
      this._messages.push({
        role,
        content: message,
        placeholder: options?.placeholder,
        ...options?.extra,
      });
      return this;
    }

    this._messages.push({
      role,
      content: _buildTemplate(`${message}`, this.args),
      placeholder: options?.placeholder,
      ...options?.extra,
    });
    return this;
  }

  async _pushAsync(
    message: WithMessageBuilderAsync,
    role: ChatMessageRole,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): Promise<PromptBuilder> {
    const _message = msg(undefined, this.args);
    await message(_message);
    this._messages.push({
      role,
      content: _message,
      placeholder: options?.placeholder,
      ...options?.extra,
    });
    return this;
  }

  userMessage(
    message: MessageInput,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder;
  userMessage(
    message: WithMessageBuilder,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder;

  userMessage(
    message: _Input,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder {
    return this._push(message, "user", options);
  }

  userMessageAsync(
    message: WithMessageBuilderAsync,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): Promise<PromptBuilder> {
    return this._pushAsync(message, "user", options);
  }

  assistantMessage(
    message: MessageInput,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder;
  assistantMessage(
    message: WithMessageBuilder,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder;

  assistantMessage(
    message: _Input,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder {
    return this._push(message, "assistant", options);
  }

  async assistantMessageAsync(
    message: WithMessageBuilderAsync,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): Promise<PromptBuilder> {
    return this._pushAsync(message, "assistant", options);
  }

  systemMessage(
    message: MessageInput,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder;
  systemMessage(
    message: WithMessageBuilder,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder;

  systemMessage(
    message: _Input,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): PromptBuilder {
    return this._push(message, "system", options);
  }

  async systemMessageAsync(
    message: WithMessageBuilderAsync,
    options?: {
      placeholder?: string;
      extra?: AIPrompter.BuildingPrompt;
    }
  ): Promise<PromptBuilder> {
    return this._pushAsync(message, "system", options);
  }

  buildForAssistant(filter?: MessageFilter): {
    messages: ThreadMessage[];
    context: string | undefined;
  } {
    const _filter = filter ? (e: any) => filter(e) : () => true;
    const messages = this._messages.filter(_filter).map((m) => {
      if (m.content instanceof MessageBuilder) {
        m.content.args = { ...this.args, ...m.content.args };
        return {
          role: m.role,
          content: m.content.build(),
          placeholder: m.placeholder,
        };
      }

      return {
        role: m.role,
        content: m.content.toString(),
        placeholder: m.placeholder,
      };
    });
    let contextParts: string[] = [];
    let msgs: ThreadMessage[] = [];

    for (const message of messages) {
      if (message.role === "system") {
        contextParts.push(message.content);
      } else {
        if (message.placeholder) {
          contextParts.push(`${message.placeholder}`);
        }
        msgs.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return {
      messages: msgs,
      context: contextParts.length > 0 ? contextParts.join("\n") : undefined,
    };
  }

  build(filter?: MessageFilter): ChatMessage[] {
    const _filter = filter ? (e: any) => filter(e) : () => true;
    return this._messages.filter(_filter).map((m) => {
      if (m.content instanceof MessageBuilder) {
        m.content.args = { ...this.args, ...m.content.args };
        return {
          role: m.role,
          content: m.content.build(),
        };
      }

      return {
        role: m.role,
        content: m.content.toString(),
      };
    });
  }
}

export function msg(
  initial: string | MessageBuilder | undefined = undefined,
  args: {
    [key: string]: any;
  } = {}
) {
  const message = new MessageBuilder(null, args);
  if (initial) {
    message.add(initial);
  }
  return message;
}

export class MessageBuilder {
  constructor(
    private customIndent: string | null = null,
    public args: {
      [key: string]: any;
    } = {}
  ) {}

  private static indent = "   ";

  static setGlobalIndent(indent: string) {
    MessageBuilder.indent = indent;
  }

  private _parts: (any | MessageBuilder)[] = [];

  private get indent() {
    return this.customIndent ?? MessageBuilder.indent;
  }

  add(message: MessageInput): MessageBuilder;
  add(message: WithMessageBuilder): MessageBuilder;

  add(message: MessageInput | WithMessageBuilder) {
    if (typeof message === "function") {
      if (message instanceof Promise) {
        throw new Error("Unsupported async message. Use addAsync instead.");
      }
      const _message = msg(undefined, this.args);
      const fn = message as WithMessageBuilder;
      fn(_message);
      this._parts.push(_message);
    } else {
      this._parts.push(message);
    }
    return this;
  }

  async addAsync(fn: WithMessageBuilderAsync): Promise<MessageBuilder> {
    const _message = msg(undefined, this.args);
    await fn(_message);
    this._parts.push(_message);
    return this;
  }

  addKv(key: string, value: MessageInput): MessageBuilder;
  addKv(key: string, value: WithMessageBuilder): MessageBuilder;
  addKv(key: string, value: any) {
    if (typeof value === "function") {
      if (value instanceof Promise) {
        throw new Error("Unsupported async message. Use addKvAsync instead.");
      }
      const _message = msg(undefined, this.args);
      value(_message);
      this._parts.push(`${key}:`);
      this._parts.push(_message);
    } else if (value instanceof MessageBuilder) {
      this._parts.push(`${key}:`);
      this._parts.push(value);
    } else {
      // is message builder
      this._parts.push(`${key}: ${value}`);
    }

    return this;
  }

  async addKvAsync(
    key: string,
    fn: WithMessageBuilderAsync
  ): Promise<MessageBuilder> {
    const _message = msg(undefined, this.args);
    await fn(_message);
    this._parts.push(`${key}: ${_message}`);
    return this;
  }

  build(withIntent: boolean = false, indent: string | null = null): string {
    const int = indent ?? this.indent;
    const parts = this._parts.map((p) => {
      let str: string | null = null;

      if (p instanceof MessageBuilder) {
        p.args = { ...this.args, ...p.args };
        str = p.build(true, int);
      } else {
        str = _buildTemplate(`${_stringifyValue(p)}`, this.args);
      }

      if (withIntent) {
        return str
          .split("\n")
          .map((line) => `${int}${line}`)
          .join(`\n`);
      }

      return str;
    });

    return parts.join("\n");
  }

  toJSON() {
    return this.build();
  }
}

function _buildTemplate(
  template: string,
  args: {
    [key: string]: any;
  }
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
    if (p1 in args) {
      return _stringifyValue(args[p1]);
    }
    console.warn(`Template argument "${p1}" not found in args`);
    return match;
  });
}

function _stringifyValue(val: any) {
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return val;
}

function isAsyncFunction(fn: Function): boolean {
  return (
    fn instanceof Promise ||
    fn.constructor.name === "AsyncFunction" ||
    fn.toString().includes("async") ||
    Object.prototype.toString.call(fn) === "[object AsyncFunction]"
  );
}
