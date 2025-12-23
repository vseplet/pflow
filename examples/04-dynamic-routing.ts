/**
 * Example 4: Dynamic Task Routing
 *
 * This example demonstrates how to route messages to different tasks
 * based on the context data, creating a branching workflow.
 */

import { Flow } from "../source/mod.ts";

// Define the context type
class NotificationContext {
  constructor(
    public type?: "email" | "sms" | "push",
    public recipient?: string,
    public message?: string,
    public sent?: boolean,
  ) {}
}

// Create the workflow
const notificationFlow = new Flow<NotificationContext>()
  .name("NotificationRouter")
  .context(NotificationContext)
  .startup(async (call) => {
    console.log("Starting notification workflow...\n");

    // Send different types of notifications
    call("router", [
      { type: "email", recipient: "user@example.com", message: "Welcome!" },
      { type: "sms", recipient: "+1234567890", message: "Your code is 1234" },
      { type: "push", recipient: "device-token-123", message: "New message" },
    ]);
  });

// Task 1: Router - decides which handler to use
notificationFlow.task({
  name: "router",
  handler: async ({ ctx, next }) => {
    console.log(`Routing ${ctx.type} notification to ${ctx.recipient}`);

    if (ctx.type === "email") {
      next("send-email", ctx);
    } else if (ctx.type === "sms") {
      next("send-sms", ctx);
    } else if (ctx.type === "push") {
      next("send-push", ctx);
    } else {
      next("handle-unknown", ctx);
    }
  },
});

// Task 2: Send email
notificationFlow.task({
  name: "send-email",
  handler: async ({ ctx, next }) => {
    console.log(`📧 Sending email to ${ctx.recipient}: "${ctx.message}"`);
    // Simulate sending email
    await new Promise((resolve) => setTimeout(resolve, 50));
    next("log", { ...ctx, sent: true });
  },
});

// Task 3: Send SMS
notificationFlow.task({
  name: "send-sms",
  handler: async ({ ctx, next }) => {
    console.log(`📱 Sending SMS to ${ctx.recipient}: "${ctx.message}"`);
    // Simulate sending SMS
    await new Promise((resolve) => setTimeout(resolve, 50));
    next("log", { ...ctx, sent: true });
  },
});

// Task 4: Send push notification
notificationFlow.task({
  name: "send-push",
  handler: async ({ ctx, next }) => {
    console.log(`🔔 Sending push to ${ctx.recipient}: "${ctx.message}"`);
    // Simulate sending push
    await new Promise((resolve) => setTimeout(resolve, 50));
    next("log", { ...ctx, sent: true });
  },
});

// Task 5: Handle unknown type
notificationFlow.task({
  name: "handle-unknown",
  handler: async ({ ctx }) => {
    console.log(`❌ Unknown notification type: ${ctx.type}`);
  },
});

// Task 6: Log successful send
notificationFlow.task({
  name: "log",
  initState: () => ({ count: 0 }),
  handler: async ({ ctx, state }) => {
    state.count++;
    console.log(`✓ ${ctx.type} sent successfully (Total sent: ${state.count})\n`);
  },
});

// Start the workflow
await notificationFlow.start();

console.log("All notifications processed!");

// Expected output:
// subscribe [NotificationRouter] router
// subscribe [NotificationRouter] send-email
// subscribe [NotificationRouter] send-sms
// subscribe [NotificationRouter] send-push
// subscribe [NotificationRouter] handle-unknown
// subscribe [NotificationRouter] log
// Starting notification workflow...
//
// Routing email notification to user@example.com
// 📧 Sending email to user@example.com: "Welcome!"
// ✓ email sent successfully (Total sent: 1)
//
// Routing sms notification to +1234567890
// 📱 Sending SMS to +1234567890: "Your code is 1234"
// ✓ sms sent successfully (Total sent: 2)
//
// Routing push notification to device-token-123
// 🔔 Sending push to device-token-123: "New message"
// ✓ push sent successfully (Total sent: 3)
//
// All notifications processed!
