/**
 * PicoFlow - A lightweight, type-safe workflow orchestration library
 *
 * @module PicoFlow
 *
 * @description
 * PicoFlow enables you to build event-driven task pipelines with an elegant fluent API.
 * It provides a simple yet powerful way to orchestrate workflows with type-safe context
 * passing and stateful task execution.
 *
 * @example
 * ```typescript
 * import { Flow } from "@vseplet/pflow";
 *
 * class MyContext {
 *   constructor(public userId?: string) {}
 * }
 *
 * const flow = new Flow<MyContext>()
 *   .name("MyWorkflow")
 *   .context(MyContext)
 *   .startup(async (call) => {
 *     call("process", { userId: "123" });
 *   });
 *
 * flow.task({
 *   name: "process",
 *   handler: async ({ ctx, next }) => {
 *     console.log(`Processing user: ${ctx.userId}`);
 *   }
 * });
 *
 * await flow.start();
 * ```
 */
import { Flow } from "./Flow.ts";

export { Flow };

export default Flow;
