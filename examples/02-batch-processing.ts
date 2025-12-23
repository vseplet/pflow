/**
 * Example 2: Batch Processing
 *
 * This example demonstrates how to process multiple items in parallel
 * by passing an array of contexts to the next() function.
 */

import { Flow } from "../source/mod.ts";

// Define the context type
class UserContext {
  constructor(
    public userId?: string,
    public email?: string,
    public processed?: boolean,
  ) {}
}

// Create the workflow
const batchFlow = new Flow<UserContext>()
  .name("BatchProcessor")
  .context(UserContext)
  .startup(async (call) => {
    console.log("Starting batch processing...\n");

    // Process multiple users at once by passing an array
    call("process-user", [
      { userId: "1", email: "user1@example.com" },
      { userId: "2", email: "user2@example.com" },
      { userId: "3", email: "user3@example.com" },
    ]);
  });

// Task 1: Process each user
batchFlow.task({
  name: "process-user",
  handler: async ({ ctx, next }) => {
    console.log(`Processing user ${ctx.userId}: ${ctx.email}`);

    // Simulate async work (e.g., database operation)
    await new Promise((resolve) => setTimeout(resolve, 100));

    next("notify", { ...ctx, processed: true });
  },
});

// Task 2: Send notification
batchFlow.task({
  name: "notify",
  handler: async ({ ctx }) => {
    console.log(`✓ Notification sent to ${ctx.email} (User ${ctx.userId})`);
  },
});

// Start the workflow
await batchFlow.start();

console.log("\nAll users processed!");

// Expected output:
// subscribe [BatchProcessor] process-user
// subscribe [BatchProcessor] notify
// Starting batch processing...
//
// Processing user 1: user1@example.com
// ✓ Notification sent to user1@example.com (User 1)
// Processing user 2: user2@example.com
// ✓ Notification sent to user2@example.com (User 2)
// Processing user 3: user3@example.com
// ✓ Notification sent to user3@example.com (User 3)
//
// All users processed!
