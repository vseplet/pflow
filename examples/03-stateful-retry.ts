/**
 * Example 3: Stateful Task with Retry Logic
 *
 * This example demonstrates how to use task state to implement
 * retry logic with a maximum number of attempts.
 */

import { Flow } from "../source/mod.ts";

// Define the context type
class ApiContext {
  constructor(
    public url?: string,
    public success?: boolean,
  ) {}
}

// Create the workflow
const apiFlow = new Flow<ApiContext>()
  .name("ApiRetry")
  .context(ApiContext)
  .startup(async (call) => {
    console.log("Starting API call with retry logic...\n");
    call("fetch-data", { url: "https://api.example.com/data" });
  });

// Task 1: Fetch data with retry logic
apiFlow.task({
  name: "fetch-data",
  // Initialize task state - this persists across task executions
  initState: () => ({ attempts: 0, maxRetries: 3 }),
  handler: async ({ ctx, state, next }) => {
    state.attempts++;
    console.log(`Attempt ${state.attempts}/${state.maxRetries} to fetch ${ctx.url}`);

    // Simulate random success/failure (70% failure rate for demo purposes)
    const success = Math.random() > 0.7;

    if (success) {
      console.log("✓ Success! Data fetched successfully.\n");
      next("process-data", { ...ctx, success: true });
    } else if (state.attempts < state.maxRetries) {
      console.log("✗ Failed. Retrying...\n");
      // Retry the same task
      next("fetch-data", ctx);
    } else {
      console.log("✗ Max retries reached. Giving up.\n");
      next("handle-error", { ...ctx, success: false });
    }
  },
});

// Task 2: Process successful data
apiFlow.task({
  name: "process-data",
  handler: async ({ ctx }) => {
    console.log("Processing fetched data...");
    console.log("Data processed successfully!");
  },
});

// Task 3: Handle error case
apiFlow.task({
  name: "handle-error",
  handler: async ({ ctx }) => {
    console.log("Handling error...");
    console.log("Error logged and alert sent to monitoring system.");
  },
});

// Start the workflow
await apiFlow.start();

// Expected output (varies due to random success):
// subscribe [ApiRetry] fetch-data
// subscribe [ApiRetry] process-data
// subscribe [ApiRetry] handle-error
// Starting API call with retry logic...
//
// Attempt 1/3 to fetch https://api.example.com/data
// ✗ Failed. Retrying...
//
// Attempt 2/3 to fetch https://api.example.com/data
// ✗ Failed. Retrying...
//
// Attempt 3/3 to fetch https://api.example.com/data
// ✓ Success! Data fetched successfully.
//
// Processing fetched data...
// Data processed successfully!
