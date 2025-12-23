import type { QueueMessage } from "./types.ts";

/**
 * A simple pub/sub queue implementation that processes messages synchronously in LIFO order.
 * Messages are published to topics and delivered to all subscribers of that topic.
 *
 * @example
 * ```typescript
 * const queue = new Queue();
 *
 * // Subscribe to a topic
 * queue.sub("user-created", (data) => {
 *   console.log("User created:", data);
 * });
 *
 * // Publish to a topic
 * queue.pub("user-created", { id: 1, name: "John" });
 * ```
 */
export class Queue {
  /**
   * Map of topic names to arrays of callback functions.
   * @private
   */
  private subscribes: { [topic: string]: Array<any> } = {};

  /**
   * Internal message queue storing pending messages.
   * Messages are processed in LIFO (Last In, First Out) order.
   * @private
   */
  private queue: Array<QueueMessage<unknown>> = [];

  /**
   * Processes the next message in the queue.
   * Pops a message from the queue and executes all subscribed callbacks for that topic.
   * Errors in callbacks are caught and logged to prevent cascading failures.
   * @private
   */
  private update(): void {
    const msg = this.queue.pop();
    if (!msg) return;

    if (!this.subscribes[msg.topic]) return;
    this.subscribes[msg.topic].forEach((cb) => {
      try {
        cb(msg.data);
      } catch (e: unknown) {
        console.error(e);
      }
    });
  }

  /**
   * Publishes data to a topic, triggering all subscribed callbacks.
   * The message is added to the front of the queue and processed immediately.
   *
   * @template D - The type of data being published
   * @param topic - The topic name to publish to
   * @param data - The data to send to subscribers
   *
   * @example
   * ```typescript
   * queue.pub("user-login", { userId: "123", timestamp: Date.now() });
   * ```
   */
  pub<D>(topic: string, data: D): void {
    this.queue.unshift({ topic, data });
    this.update();
  }

  /**
   * Subscribes a callback function to a topic.
   * The callback will be invoked whenever data is published to that topic.
   * Multiple callbacks can subscribe to the same topic.
   *
   * @template D - The type of data the callback expects
   * @param topic - The topic name to subscribe to
   * @param callback - Function to call when data is published to this topic
   *
   * @example
   * ```typescript
   * queue.sub<{ userId: string }>("user-login", async (data) => {
   *   console.log(`User ${data.userId} logged in`);
   *   await sendNotification(data.userId);
   * });
   * ```
   */
  sub<D>(topic: string, callback: (data: D) => void | Promise<void>): void {
    if (this.subscribes[topic] === undefined) this.subscribes[topic] = [];
    this.subscribes[topic].push(callback);
  }
}
