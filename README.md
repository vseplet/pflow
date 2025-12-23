# PicoFlow

[![Test](https://github.com/vseplet/PicoFlow/actions/workflows/test.yml/badge.svg)](https://github.com/vseplet/PicoFlow/actions/workflows/test.yml)
[![JSR](https://jsr.io/badges/@vseplet/pflow)](https://jsr.io/@vseplet/pflow)
[![JSR Score](https://jsr.io/badges/@vseplet/pflow/score)](https://jsr.io/@vseplet/pflow)

A lightweight, type-safe workflow orchestration library for Deno and TypeScript. PicoFlow enables
you to build event-driven task pipelines with an elegant fluent API.

## Features

- **Simple & Lightweight**: Minimalistic core with no external dependencies
- **Type-Safe**: Full TypeScript support with generic types
- **Event-Driven**: Built on pub/sub pattern for loose coupling
- **Fluent API**: Chainable methods for readable workflow definitions
- **Stateful Tasks**: Each task can maintain its own state across executions
- **Context Management**: Pass typed context data through your workflow
- **Error Handling**: Built-in error handling for robust workflows

## Installation

### Deno

```typescript
import { Flow } from "jsr:@vseplet/pflow";
```

Or add to your `deno.json`:

```json
{
  "imports": {
    "pflow": "jsr:@vseplet/pflow"
  }
}
```

## Quick Start

```typescript
import { Flow } from "jsr:@vseplet/pflow";

// Define your context type
class MyContext {
  constructor(
    public userId?: string,
    public data?: any,
  ) {}
}

// Create a workflow
const flow = new Flow<MyContext>()
  .name("MyWorkflow")
  .context(MyContext)
  .startup(async (call) => {
    // Start the workflow
    call("process", { userId: "123" });
  });

// Define tasks
const processTask = flow.task({
  name: "process",
  handler: async ({ ctx, next }) => {
    console.log(`Processing user: ${ctx.userId}`);
    next("complete", { userId: ctx.userId, data: "processed" });
  },
});

flow.task({
  name: "complete",
  handler: async ({ ctx }) => {
    console.log(`Completed for user: ${ctx.userId}`);
  },
});

// Start the workflow
await flow.start();
```

## Core Concepts

### Flow

The `Flow` class is the main orchestrator that manages your workflow. It extends the `Queue` class
to provide pub/sub functionality.

### Context

Context is a typed object that flows through your tasks. Define it as a class with the data you need
to pass between tasks.

```typescript
class EmailContext {
  constructor(
    public to?: string,
    public subject?: string,
    public body?: string,
    public sent?: boolean,
  ) {}
}
```

### Tasks

Tasks are the units of work in your workflow. Each task:

- Has a unique name
- Receives context and state
- Can call other tasks using `next()`
- Can maintain its own state across executions

```typescript
flow.task({
  name: "send-email",
  initState: () => ({ retryCount: 0 }),
  handler: async ({ ctx, state, next }) => {
    console.log(`Sending email to ${ctx.to}`);
    state.retryCount++;
    next("log", { sent: true });
  },
});
```

### Startup Handler

The startup handler is called when the workflow starts. Use it to trigger initial tasks.

```typescript
flow.startup(async (call) => {
  call("first-task", { userId: "123" });
  // You can call multiple tasks
  call("another-task", { data: "initial" });
});
```

## API Reference

### Flow Methods

#### `name(name: string): Flow<C>`

Sets the workflow name. Task names will be prefixed with `[WorkflowName]`.

#### `context(constructor: new (params: Partial<C>) => C): Flow<C>`

Sets the context constructor class.

#### `task<S>(args: { name: string; handler: FlowTaskHandlerType<C, S>; initState?: () => S }): string`

Defines a new task. Returns the full task name including workflow prefix.

**Parameters:**

- `name` - Task identifier
- `handler` - Async function that processes the task
- `initState` - Optional function to initialize task state

**Handler receives:**

- `ctx` - The context object
- `state` - Task-specific state (persists across calls)
- `name` - Full task name
- `next` - Function to call the next task

#### `startup(handler: FlowStartupHandlerType<C>): Flow<C>`

Sets the startup handler that runs when the workflow starts.

#### `start(): Promise<void>`

Starts the workflow by subscribing all tasks and calling the startup handler.

#### `next(name: string, params?: Partial<C> | Array<Partial<C>>): void`

Triggers a task with new context. Can pass a single context or an array for batch processing.

### Queue Methods (inherited)

#### `pub<D>(topic: string, data: D): void`

Publishes data to a topic.

#### `sub<D>(topic: string, callback: (data: D) => void | Promise<void>): void`

Subscribes to a topic with a callback.

## Examples

### Example 1: Simple Data Pipeline

```typescript
import { Flow } from "jsr:@vseplet/pflow";

class DataContext {
  constructor(
    public value?: number,
    public result?: number,
  ) {}
}

const pipeline = new Flow<DataContext>()
  .name("DataPipeline")
  .context(DataContext)
  .startup(async (call) => {
    call("multiply", { value: 5 });
  });

pipeline.task({
  name: "multiply",
  handler: async ({ ctx, next }) => {
    const result = ctx.value! * 2;
    console.log(`${ctx.value} * 2 = ${result}`);
    next("add", { value: result });
  },
});

pipeline.task({
  name: "add",
  handler: async ({ ctx, next }) => {
    const result = ctx.value! + 10;
    console.log(`${ctx.value} + 10 = ${result}`);
    next("finish", { result });
  },
});

pipeline.task({
  name: "finish",
  handler: async ({ ctx }) => {
    console.log(`Final result: ${ctx.result}`);
  },
});

await pipeline.start();
// Output:
// 5 * 2 = 10
// 10 + 10 = 20
// Final result: 20
```

### Example 2: Batch Processing

```typescript
import { Flow } from "jsr:@vseplet/pflow";

class UserContext {
  constructor(
    public userId?: string,
    public email?: string,
    public processed?: boolean,
  ) {}
}

const batchFlow = new Flow<UserContext>()
  .name("BatchProcessor")
  .context(UserContext)
  .startup(async (call) => {
    // Process multiple users at once
    call("process-user", [
      { userId: "1", email: "user1@example.com" },
      { userId: "2", email: "user2@example.com" },
      { userId: "3", email: "user3@example.com" },
    ]);
  });

batchFlow.task({
  name: "process-user",
  handler: async ({ ctx, next }) => {
    console.log(`Processing ${ctx.email}`);
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 100));
    next("notify", { ...ctx, processed: true });
  },
});

batchFlow.task({
  name: "notify",
  handler: async ({ ctx }) => {
    console.log(`Notification sent to ${ctx.email}`);
  },
});

await batchFlow.start();
```

### Example 3: Stateful Task with Retry Logic

```typescript
import { Flow } from "jsr:@vseplet/pflow";

class ApiContext {
  constructor(
    public url?: string,
    public success?: boolean,
  ) {}
}

const apiFlow = new Flow<ApiContext>()
  .name("ApiRetry")
  .context(ApiContext)
  .startup(async (call) => {
    call("fetch-data", { url: "https://api.example.com/data" });
  });

apiFlow.task({
  name: "fetch-data",
  initState: () => ({ attempts: 0, maxRetries: 3 }),
  handler: async ({ ctx, state, next }) => {
    state.attempts++;
    console.log(`Attempt ${state.attempts} to fetch ${ctx.url}`);

    // Simulate random failure
    const success = Math.random() > 0.5;

    if (success) {
      console.log("Success!");
      next("process-data", { ...ctx, success: true });
    } else if (state.attempts < state.maxRetries) {
      console.log("Failed, retrying...");
      next("fetch-data", ctx);
    } else {
      console.log("Max retries reached, giving up");
      next("handle-error", { ...ctx, success: false });
    }
  },
});

apiFlow.task({
  name: "process-data",
  handler: async ({ ctx }) => {
    console.log("Data processed successfully");
  },
});

apiFlow.task({
  name: "handle-error",
  handler: async ({ ctx }) => {
    console.log("Error handled, sending alert");
  },
});

await apiFlow.start();
```

## Advanced Usage

### Custom Queue Implementation

Since `Flow` extends `Queue`, you can use the underlying pub/sub mechanism directly:

```typescript
const flow = new Flow();

// Subscribe to custom topics
flow.sub("custom-event", (data) => {
  console.log("Custom event:", data);
});

// Publish to custom topics
flow.pub("custom-event", { message: "Hello!" });
```

### Dynamic Task Routing

```typescript
flow.task({
  name: "router",
  handler: async ({ ctx, next }) => {
    if (ctx.type === "email") {
      next("send-email", ctx);
    } else if (ctx.type === "sms") {
      next("send-sms", ctx);
    } else {
      next("handle-unknown", ctx);
    }
  },
});
```

## How It Works

PicoFlow uses an internal message queue with a pub/sub pattern:

1. When you call `next()`, it creates a new context and publishes it to a topic
2. Tasks subscribe to their specific topic names
3. The queue processes messages synchronously (LIFO - Last In First Out)
4. Each task handler receives the context and can trigger other tasks

The workflow is single-threaded and processes messages sequentially, ensuring predictable execution
order.

## Type Safety

PicoFlow is fully typed. TypeScript will enforce:

- Context type consistency across tasks
- Task state types
- Handler parameter types

```typescript
// TypeScript will catch errors
flow.task({
  name: "typed-task",
  handler: async ({ ctx, next }) => {
    // ctx is typed as MyContext
    console.log(ctx.userId); // ✓ OK
    console.log(ctx.wrongProp); // ✗ Type error
    next("other-task", { userId: "123" }); // ✓ OK
    next("other-task", { wrong: "field" }); // ✗ Type error
  },
});
```

## Best Practices

1. **Keep tasks focused**: Each task should do one thing well
2. **Use meaningful names**: Task names should describe what they do
3. **Handle errors**: Tasks have built-in error handling, but log appropriately
4. **Type your context**: Always define a proper context class/interface
5. **Avoid infinite loops**: Be careful with task chains that might loop
6. **Use state wisely**: Task state persists across calls - use it for counters, caches, etc.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Development

### Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Run tests with coverage
deno task test:coverage

# Run linting and formatting checks
deno task check
```

### Test Suite

PicoFlow has a comprehensive test suite with 30+ tests covering:

- Queue pub/sub functionality
- Flow workflow orchestration
- Task execution and chaining
- State management
- Error handling
- Real-world integration scenarios

All tests run automatically on every push via GitHub Actions.
