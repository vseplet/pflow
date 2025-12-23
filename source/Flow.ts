import { Queue } from "./Queue.ts";
import type {
  FlowContextType,
  FlowStartupHandlerType,
  FlowTaskHandlerType,
  FlowTaskStateType,
  FlowWorkflowType,
} from "./types.ts";

/**
 * A workflow orchestration class that manages task execution with typed contexts.
 * Flow extends Queue to provide pub/sub functionality with additional workflow features.
 *
 * Features:
 * - Type-safe context passing between tasks
 * - Stateful task execution
 * - Fluent API for workflow definition
 * - Built-in error handling
 * - Batch processing support
 *
 * @template C - The context type that flows through the workflow
 *
 * @example
 * ```typescript
 * class MyContext {
 *   constructor(public userId?: string, public data?: any) {}
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
 *     next("complete", ctx);
 *   }
 * });
 *
 * await flow.start();
 * ```
 */
export class Flow<C extends FlowContextType> extends Queue {
  /**
   * Internal workflow configuration object.
   * @private
   */
  private workflow: FlowWorkflowType<C> = {
    contextConstructor: () => {
      throw new Error("Not implemented!");
    },
    name: "unknown",
    tasks: {},
    startup: async () => {},
  };

  /**
   * Sets the workflow name. Task names will be prefixed with `[WorkflowName]`.
   *
   * @param name - The name for this workflow
   * @returns The Flow instance for method chaining
   *
   * @example
   * ```typescript
   * const flow = new Flow()
   *   .name("UserRegistration");
   * // Tasks will be named like: [UserRegistration] validate-email
   * ```
   */
  name(name: string): Flow<C> {
    this.workflow.name = name;
    return this;
  }

  /**
   * Sets the context constructor class used to create context objects.
   *
   * @param constructor - A class constructor that accepts partial context parameters
   * @returns The Flow instance for method chaining
   *
   * @example
   * ```typescript
   * class EmailContext {
   *   constructor(public to?: string, public subject?: string) {}
   * }
   *
   * const flow = new Flow<EmailContext>()
   *   .context(EmailContext);
   * ```
   */
  context(constructor: new (params: Partial<C>) => C): Flow<C> {
    this.workflow.contextConstructor = (params) => new constructor(params);
    return this;
  }

  /**
   * Defines a new task in the workflow.
   * Tasks are the units of work that process context data and can trigger other tasks.
   *
   * @template S - The type of state this task maintains
   * @param args - Task configuration object
   * @param args.name - The task identifier (will be prefixed with workflow name)
   * @param args.handler - Async function that processes the task
   * @param args.initState - Optional function to initialize task state (persists across calls)
   * @returns The full task name including workflow prefix
   *
   * @example
   * ```typescript
   * flow.task({
   *   name: "send-email",
   *   initState: () => ({ sentCount: 0 }),
   *   handler: async ({ ctx, state, next }) => {
   *     console.log(`Sending email to ${ctx.email}`);
   *     state.sentCount++;
   *     next("log", ctx);
   *   }
   * });
   * ```
   */
  task<S extends FlowTaskStateType>(
    args: {
      name: string;
      handler: FlowTaskHandlerType<C, S>;
      initState?: () => S;
    },
  ): string {
    const taskState: S = args.initState ? args.initState() : {} as S;
    const taskName = `[${this.workflow.name}] ${args.name}`;

    this.workflow.tasks[taskName] = {
      name: taskName,
      handler: async (msg: any) => {
        try {
          await args.handler({
            ctx: msg,
            state: taskState,
            name: taskName,
            next: (...args) => this.next(...args),
          });
        } catch (e: unknown) {
          console.error(e);
        }
      },
    };

    return taskName;
  }

  /**
   * Triggers a task with new context data.
   * Can accept a single context object or an array for batch processing.
   *
   * @param name - The name of the task to trigger (without workflow prefix)
   * @param params - Context parameters for the task (single object or array)
   *
   * @example
   * ```typescript
   * // Single task call
   * next("process-user", { userId: "123" });
   *
   * // Batch processing
   * next("process-user", [
   *   { userId: "123" },
   *   { userId: "456" },
   *   { userId: "789" }
   * ]);
   * ```
   */
  next(
    name: string,
    params?: Partial<C> | Array<Partial<C>>,
  ): void {
    // Add workflow prefix to task name
    const fullTaskName = `[${this.workflow.name}] ${name}`;

    if (params) {
      if (params instanceof Array) {
        params.forEach((entry) => {
          const newContext = this.workflow.contextConstructor(entry);
          this.pub(fullTaskName, newContext);
        });
      } else {
        this.pub(fullTaskName, this.workflow.contextConstructor(params));
      }
    } else {
      this.pub(fullTaskName, this.workflow.contextConstructor({}));
    }
  }

  /**
   * Sets the startup handler that runs when the workflow starts.
   * The startup handler typically triggers the initial tasks in the workflow.
   *
   * @param handler - Async function that receives a call function to trigger tasks
   * @returns The Flow instance for method chaining
   *
   * @example
   * ```typescript
   * flow.startup(async (call) => {
   *   // Trigger initial task(s)
   *   call("validate-input", { data: "initial" });
   *
   *   // Can trigger multiple tasks
   *   call("another-task", { value: 123 });
   * });
   * ```
   */
  startup(handler: FlowStartupHandlerType<C>): Flow<C> {
    this.workflow.startup = () => handler((...args) => this.next(...args));
    return this;
  }

  /**
   * Starts the workflow by subscribing all tasks and executing the startup handler.
   * This method should be called after all tasks and configuration are defined.
   * It logs each task subscription and handles any errors in the startup handler.
   *
   * @returns A promise that resolves when the startup handler completes
   *
   * @example
   * ```typescript
   * const flow = new Flow<MyContext>()
   *   .name("MyWorkflow")
   *   .context(MyContext)
   *   .startup(async (call) => {
   *     call("first-task");
   *   });
   *
   * flow.task({
   *   name: "first-task",
   *   handler: async ({ ctx }) => {
   *     console.log("Task executed!");
   *   }
   * });
   *
   * await flow.start();
   * ```
   */
  async start(): Promise<void> {
    for (const topic in this.workflow.tasks) {
      const task = this.workflow.tasks[topic];
      this.sub(task.name, task.handler);
      console.log(`subscribe ${task.name}`);
    }

    try {
      await this.workflow.startup();
    } catch (e: unknown) {
      console.error(e);
    }
  }
}
