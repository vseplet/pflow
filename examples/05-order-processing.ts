/**
 * Example 5: Order Processing Workflow
 *
 * This example demonstrates a real-world e-commerce order processing
 * workflow with validation, payment, inventory, and shipping steps.
 */

import { Flow } from "../source/mod.ts";

// Define the context type
class OrderContext {
  constructor(
    public orderId?: string,
    public userId?: string,
    public items?: Array<{ id: string; quantity: number; price: number }>,
    public totalAmount?: number,
    public paymentStatus?: "pending" | "paid" | "failed",
    public inventoryStatus?: "available" | "unavailable",
    public shippingStatus?: "pending" | "shipped" | "delivered",
  ) {}
}

// Create the workflow
const orderFlow = new Flow<OrderContext>()
  .name("OrderProcessing")
  .context(OrderContext)
  .startup(async (call) => {
    console.log("=== Order Processing System ===\n");

    // Simulate multiple orders
    call("validate-order", [
      {
        orderId: "ORD-001",
        userId: "user123",
        items: [
          { id: "item1", quantity: 2, price: 29.99 },
          { id: "item2", quantity: 1, price: 49.99 },
        ],
      },
      {
        orderId: "ORD-002",
        userId: "user456",
        items: [
          { id: "item3", quantity: 1, price: 99.99 },
        ],
      },
    ]);
  });

// Task 1: Validate order
orderFlow.task({
  name: "validate-order",
  handler: async ({ ctx, next }) => {
    console.log(`\n📋 Validating order ${ctx.orderId}...`);

    // Calculate total
    const total = ctx.items!.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Validate order data
    if (!ctx.userId || !ctx.items || ctx.items.length === 0) {
      console.log(`❌ Order ${ctx.orderId} validation failed`);
      next("cancel-order", ctx);
      return;
    }

    console.log(`✓ Order ${ctx.orderId} validated. Total: $${total.toFixed(2)}`);
    next("process-payment", { ...ctx, totalAmount: total, paymentStatus: "pending" });
  },
});

// Task 2: Process payment
orderFlow.task({
  name: "process-payment",
  handler: async ({ ctx, next }) => {
    console.log(`💳 Processing payment for order ${ctx.orderId}...`);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate random payment success (90% success rate)
    const paymentSuccess = Math.random() > 0.1;

    if (paymentSuccess) {
      console.log(`✓ Payment successful for order ${ctx.orderId}: $${ctx.totalAmount!.toFixed(2)}`);
      next("check-inventory", { ...ctx, paymentStatus: "paid" });
    } else {
      console.log(`❌ Payment failed for order ${ctx.orderId}`);
      next("cancel-order", { ...ctx, paymentStatus: "failed" });
    }
  },
});

// Task 3: Check inventory
orderFlow.task({
  name: "check-inventory",
  handler: async ({ ctx, next }) => {
    console.log(`📦 Checking inventory for order ${ctx.orderId}...`);

    // Simulate inventory check
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate random inventory availability (95% available)
    const available = Math.random() > 0.05;

    if (available) {
      console.log(`✓ All items available for order ${ctx.orderId}`);
      next("ship-order", { ...ctx, inventoryStatus: "available", shippingStatus: "pending" });
    } else {
      console.log(`❌ Items unavailable for order ${ctx.orderId}`);
      next("refund-payment", { ...ctx, inventoryStatus: "unavailable" });
    }
  },
});

// Task 4: Ship order
orderFlow.task({
  name: "ship-order",
  handler: async ({ ctx, next }) => {
    console.log(`🚚 Shipping order ${ctx.orderId}...`);

    // Simulate shipping
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`✓ Order ${ctx.orderId} shipped to user ${ctx.userId}`);
    next("complete-order", { ...ctx, shippingStatus: "shipped" });
  },
});

// Task 5: Complete order
orderFlow.task({
  name: "complete-order",
  initState: () => ({ completedOrders: 0, totalRevenue: 0 }),
  handler: async ({ ctx, state }) => {
    state.completedOrders++;
    state.totalRevenue += ctx.totalAmount!;

    console.log(`✅ Order ${ctx.orderId} completed successfully!`);
    console.log(
      `   📊 Stats: ${state.completedOrders} orders completed, $${
        state.totalRevenue.toFixed(2)
      } revenue`,
    );
  },
});

// Task 6: Refund payment
orderFlow.task({
  name: "refund-payment",
  handler: async ({ ctx, next }) => {
    console.log(`💰 Refunding payment for order ${ctx.orderId}...`);

    // Simulate refund
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`✓ Refund processed for order ${ctx.orderId}: $${ctx.totalAmount!.toFixed(2)}`);
    next("cancel-order", ctx);
  },
});

// Task 7: Cancel order
orderFlow.task({
  name: "cancel-order",
  initState: () => ({ cancelledOrders: 0 }),
  handler: async ({ ctx, state }) => {
    state.cancelledOrders++;
    console.log(`❌ Order ${ctx.orderId} cancelled`);
    console.log(`   📊 Total cancelled orders: ${state.cancelledOrders}`);
  },
});

// Start the workflow
await orderFlow.start();

console.log("\n=== Order processing complete ===");
