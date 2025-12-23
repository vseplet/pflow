/**
 * Example 1: Simple Data Pipeline
 *
 * This example demonstrates a basic workflow that processes a number
 * through multiple transformation steps.
 */

import { Flow } from "../source/mod.ts";

// Define the context type
class DataContext {
  constructor(
    public value?: number,
    public result?: number,
  ) {}
}

// Create the workflow
const pipeline = new Flow<DataContext>()
  .name("DataPipeline")
  .context(DataContext)
  .startup(async (call) => {
    console.log("Starting pipeline with value: 5");
    call("multiply", { value: 5 });
  });

// Task 1: Multiply by 2
pipeline.task({
  name: "multiply",
  handler: async ({ ctx, next }) => {
    const result = ctx.value! * 2;
    console.log(`Multiply: ${ctx.value} * 2 = ${result}`);
    next("add", { value: result });
  },
});

// Task 2: Add 10
pipeline.task({
  name: "add",
  handler: async ({ ctx, next }) => {
    const result = ctx.value! + 10;
    console.log(`Add: ${ctx.value} + 10 = ${result}`);
    next("finish", { result });
  },
});

// Task 3: Finish
pipeline.task({
  name: "finish",
  handler: async ({ ctx }) => {
    console.log(`Final result: ${ctx.result}`);
  },
});

// Start the workflow
await pipeline.start();

// Expected output:
// subscribe [DataPipeline] multiply
// subscribe [DataPipeline] add
// subscribe [DataPipeline] finish
// Starting pipeline with value: 5
// Multiply: 5 * 2 = 10
// Add: 10 + 10 = 20
// Final result: 20
