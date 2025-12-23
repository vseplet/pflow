/**
 * Represents a message in the queue with a topic and associated data.
 * @template D - The type of data contained in the message
 */
export type QueueMessage<D> = { topic: string; data: D };

/**
 * Base type for Flow context objects. Can contain any key-value pairs.
 */
export type FlowContextType = { [key: string]: any };

/**
 * Function type for constructing a context object from partial parameters.
 * @template C - The context type
 * @param params - Partial context parameters to construct from
 * @returns A fully constructed context object
 */
export type FlowContextConstructorType<C> = (params: Partial<C>) => C;

/**
 * Base type for task state objects. Can contain any key-value pairs.
 * Task state persists across multiple task executions.
 */
export type FlowTaskStateType = { [key: string]: any };

/**
 * Function type for triggering the next task in the workflow.
 * @template C - The context type
 * @param name - The name of the task to trigger
 * @param params - Context parameters for the next task (can be single object or array for batch processing)
 */
export type FlowNextType<C extends FlowContextType> = (
  name: string,
  params?: Partial<C> | Array<Partial<C>>,
) => void;

/**
 * Function type for the startup handler that initializes the workflow.
 * @template C - The context type
 * @param call - Function to trigger the first task(s) in the workflow
 */
export type FlowStartupHandlerType<C extends FlowContextType> = (
  call: FlowNextType<C>,
) => Promise<void>;

/**
 * Function type for task handlers that process workflow tasks.
 * @template C - The context type
 * @template S - The task state type
 * @param args - Object containing task execution context
 * @param args.ctx - The context object passed to this task
 * @param args.state - Persistent state specific to this task
 * @param args.name - The full name of this task
 * @param args.next - Function to trigger the next task
 */
export type FlowTaskHandlerType<
  C extends FlowContextType,
  S extends FlowTaskStateType,
> = (
  args: {
    ctx: C;
    state: S;
    name: string;
    next: FlowNextType<C>;
  },
) => Promise<void>;

/**
 * Represents a task in the workflow.
 * @template C - The context type
 * @template S - The task state type
 */
export type FlowTaskType<
  C extends FlowContextType,
  S extends FlowTaskStateType,
> = {
  /** The unique name of the task */
  name: string;
  /** The async handler function that executes the task logic */
  handler: FlowTaskHandlerType<C, S>;
};

/**
 * Represents the complete workflow configuration.
 * @template C - The context type
 */
export type FlowWorkflowType<C extends FlowContextType> = {
  /** The name of the workflow */
  name: string;
  /** Function to construct context objects */
  contextConstructor: FlowContextConstructorType<C>;
  /** Map of task names to task definitions */
  tasks: {
    [name: string]: FlowTaskType<C, any>;
  };
  /** Function called when the workflow starts */
  startup: () => Promise<void>;
};
