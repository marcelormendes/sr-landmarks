/**
 * Higher-order function that combines multiple async functions into a pipeline
 */
export const pipelineAsync = async <T, R>(
  initialValue: T,
  fns: Array<(input: unknown) => Promise<unknown>>,
): Promise<R> => {
  return fns.reduce(
    async (promiseResult, fn) => fn(await promiseResult),
    Promise.resolve(initialValue),
  ) as Promise<R>
}
