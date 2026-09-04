export function createGasException(message: string): Error {
  const error = new Error(message);
  error.name = "Exception";

  return error;
}
