/**
 * Tests for Queue class
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { Queue } from "../source/Queue.ts";

Deno.test("Queue - should create instance", () => {
  const queue = new Queue();
  assertExists(queue);
});

Deno.test("Queue - pub/sub basic functionality", () => {
  const queue = new Queue();
  let received: any = null;

  queue.sub("test-topic", (data) => {
    received = data;
  });

  queue.pub("test-topic", { message: "hello" });

  assertEquals(received, { message: "hello" });
});

Deno.test("Queue - multiple subscribers to same topic", () => {
  const queue = new Queue();
  const results: any[] = [];

  queue.sub("test-topic", (data) => {
    results.push({ subscriber: 1, data });
  });

  queue.sub("test-topic", (data) => {
    results.push({ subscriber: 2, data });
  });

  queue.pub("test-topic", { value: 42 });

  assertEquals(results.length, 2);
  assertEquals(results[0].data, { value: 42 });
  assertEquals(results[1].data, { value: 42 });
});

Deno.test("Queue - typed data publishing", () => {
  const queue = new Queue();
  let received: { id: number; name: string } | null = null;

  queue.sub<{ id: number; name: string }>("user", (data) => {
    received = data;
  });

  queue.pub("user", { id: 1, name: "John" });

  assertEquals(received, { id: 1, name: "John" });
});

Deno.test("Queue - async handlers", async () => {
  const queue = new Queue();
  let processed = false;

  queue.sub("async-topic", async (_data) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    processed = true;
  });

  queue.pub("async-topic", { test: true });

  // Give async handler time to complete
  await new Promise((resolve) => setTimeout(resolve, 50));

  assertEquals(processed, true);
});

Deno.test("Queue - no subscribers for topic", () => {
  const queue = new Queue();

  // Should not throw error when publishing to topic with no subscribers
  queue.pub("nonexistent", { data: "test" });

  // If we get here, test passes
  assertEquals(true, true);
});

Deno.test("Queue - error handling in subscriber", () => {
  const queue = new Queue();
  let successCalled = false;

  queue.sub("error-topic", () => {
    throw new Error("Subscriber error");
  });

  queue.sub("error-topic", () => {
    successCalled = true;
  });

  // Should not throw, errors are caught internally
  queue.pub("error-topic", { test: true });

  // Second subscriber should still be called
  assertEquals(successCalled, true);
});

Deno.test("Queue - LIFO message processing", () => {
  const queue = new Queue();
  const results: number[] = [];

  queue.sub("order-topic", (data: number) => {
    results.push(data);
  });

  // Publish multiple messages
  // Note: Due to synchronous processing, each pub() processes immediately
  queue.pub("order-topic", 1);
  queue.pub("order-topic", 2);
  queue.pub("order-topic", 3);

  // Messages should be processed in the order they were published
  // because each pub() calls update() immediately
  assertEquals(results, [1, 2, 3]);
});

Deno.test("Queue - multiple topics independently", () => {
  const queue = new Queue();
  let topic1Data: any = null;
  let topic2Data: any = null;

  queue.sub("topic1", (data) => {
    topic1Data = data;
  });

  queue.sub("topic2", (data) => {
    topic2Data = data;
  });

  queue.pub("topic1", { value: "first" });
  queue.pub("topic2", { value: "second" });

  assertEquals(topic1Data, { value: "first" });
  assertEquals(topic2Data, { value: "second" });
});
