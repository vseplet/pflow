/**
 * Tests for Flow class
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { Flow } from "../source/Flow.ts";

// Test context class
class TestContext {
  value?: number;
  message?: string;
  processed?: boolean;

  constructor(params: Partial<TestContext> = {}) {
    Object.assign(this, params);
  }
}

Deno.test("Flow - should create instance", () => {
  const flow = new Flow<TestContext>();
  assertExists(flow);
});

Deno.test("Flow - set workflow name", () => {
  const flow = new Flow<TestContext>().name("TestWorkflow");
  assertExists(flow);
});

Deno.test("Flow - set context constructor", () => {
  const flow = new Flow<TestContext>()
    .name("Test")
    .context(TestContext);
  assertExists(flow);
});

Deno.test("Flow - define task and get task name", () => {
  const flow = new Flow<TestContext>()
    .name("TestWorkflow")
    .context(TestContext);

  const taskName = flow.task({
    name: "test-task",
    handler: async () => {},
  });

  assertEquals(taskName, "[TestWorkflow] test-task");
});

Deno.test("Flow - task execution", async () => {
  const flow = new Flow<TestContext>()
    .name("TestWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("process", { value: 42 });
    });

  let executedValue: number | undefined;

  flow.task({
    name: "process",
    handler: async ({ ctx }) => {
      executedValue = ctx.value;
    },
  });

  await flow.start();

  assertEquals(executedValue, 42);
});

Deno.test("Flow - task chaining with next", async () => {
  const flow = new Flow<TestContext>()
    .name("ChainWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("first", { value: 10 });
    });

  const results: number[] = [];

  flow.task({
    name: "first",
    handler: async ({ ctx, next }) => {
      results.push(ctx.value!);
      next("second", { value: ctx.value! * 2 });
    },
  });

  flow.task({
    name: "second",
    handler: async ({ ctx }) => {
      results.push(ctx.value!);
    },
  });

  await flow.start();

  assertEquals(results, [10, 20]);
});

Deno.test("Flow - stateful task", async () => {
  const flow = new Flow<TestContext>()
    .name("StatefulWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("counter", { value: 1 });
      call("counter", { value: 2 });
      call("counter", { value: 3 });
    });

  let finalCount = 0;

  flow.task({
    name: "counter",
    initState: () => ({ count: 0 }),
    handler: async ({ ctx, state }) => {
      state.count += ctx.value!;
      finalCount = state.count;
    },
  });

  await flow.start();

  assertEquals(finalCount, 6); // 1 + 2 + 3
});

Deno.test("Flow - batch processing with array", async () => {
  const flow = new Flow<TestContext>()
    .name("BatchWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("process", [
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ]);
    });

  const processed: number[] = [];

  flow.task({
    name: "process",
    handler: async ({ ctx }) => {
      processed.push(ctx.value!);
    },
  });

  await flow.start();

  // Should process all three items
  assertEquals(processed.length, 3);
  assertEquals(processed.includes(1), true);
  assertEquals(processed.includes(2), true);
  assertEquals(processed.includes(3), true);
});

Deno.test("Flow - task with no initial context params", async () => {
  const flow = new Flow<TestContext>()
    .name("EmptyContextWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("process");
    });

  let executed = false;

  flow.task({
    name: "process",
    handler: async () => {
      executed = true;
    },
  });

  await flow.start();

  assertEquals(executed, true);
});

Deno.test("Flow - multiple independent tasks", async () => {
  const flow = new Flow<TestContext>()
    .name("MultiTaskWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("task1", { value: 1 });
      call("task2", { value: 2 });
    });

  const results: number[] = [];

  flow.task({
    name: "task1",
    handler: async ({ ctx }) => {
      results.push(ctx.value!);
    },
  });

  flow.task({
    name: "task2",
    handler: async ({ ctx }) => {
      results.push(ctx.value!);
    },
  });

  await flow.start();

  assertEquals(results.length, 2);
  assertEquals(results.includes(1), true);
  assertEquals(results.includes(2), true);
});

Deno.test("Flow - context transformation through chain", async () => {
  const flow = new Flow<TestContext>()
    .name("TransformWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("step1", { value: 5 });
    });

  let finalValue: number | undefined;

  flow.task({
    name: "step1",
    handler: async ({ ctx, next }) => {
      next("step2", { value: ctx.value! * 2 }); // 5 * 2 = 10
    },
  });

  flow.task({
    name: "step2",
    handler: async ({ ctx, next }) => {
      next("step3", { value: ctx.value! + 5 }); // 10 + 5 = 15
    },
  });

  flow.task({
    name: "step3",
    handler: async ({ ctx }) => {
      finalValue = ctx.value;
    },
  });

  await flow.start();

  assertEquals(finalValue, 15);
});

Deno.test("Flow - task error handling", async () => {
  const flow = new Flow<TestContext>()
    .name("ErrorWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("failing-task", { value: 1 });
      call("success-task", { value: 2 });
    });

  let successExecuted = false;

  flow.task({
    name: "failing-task",
    handler: async () => {
      throw new Error("Task error");
    },
  });

  flow.task({
    name: "success-task",
    handler: async () => {
      successExecuted = true;
    },
  });

  await flow.start();

  // Success task should still execute despite error in failing task
  assertEquals(successExecuted, true);
});

Deno.test("Flow - conditional routing", async () => {
  const flow = new Flow<TestContext>()
    .name("RoutingWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("router", { value: 10 });
      call("router", { value: 5 });
    });

  const highResults: number[] = [];
  const lowResults: number[] = [];

  flow.task({
    name: "router",
    handler: async ({ ctx, next }) => {
      if (ctx.value! > 7) {
        next("high", ctx);
      } else {
        next("low", ctx);
      }
    },
  });

  flow.task({
    name: "high",
    handler: async ({ ctx }) => {
      highResults.push(ctx.value!);
    },
  });

  flow.task({
    name: "low",
    handler: async ({ ctx }) => {
      lowResults.push(ctx.value!);
    },
  });

  await flow.start();

  assertEquals(highResults, [10]);
  assertEquals(lowResults, [5]);
});

Deno.test("Flow - state persists across multiple calls", async () => {
  const flow = new Flow<TestContext>()
    .name("StateWorkflow")
    .context(TestContext)
    .startup(async (call) => {
      call("accumulator", { value: 1 });
      call("accumulator", { value: 2 });
      call("accumulator", { value: 3 });
    });

  const history: number[] = [];

  flow.task({
    name: "accumulator",
    initState: () => ({ total: 0, calls: 0 }),
    handler: async ({ ctx, state }) => {
      state.total += ctx.value!;
      state.calls += 1;
      history.push(state.total);
    },
  });

  await flow.start();

  // Should accumulate: 1, then 1+2=3, then 3+3=6
  assertEquals(history, [1, 3, 6]);
});

Deno.test("Flow - fluent API chaining", () => {
  const flow = new Flow<TestContext>()
    .name("ChainedWorkflow")
    .context(TestContext)
    .startup(async () => {});

  assertExists(flow);
});
