export interface ReferenceExecutionErrorObservation {
  statusCode: number | null;
  statusMessage: string | null;
  errorMessage: string | null;
  errorType: string | null;
  scriptStackTraceFunctions: string[];
}

export class ReferenceExecutionError extends Error {
  readonly observation: ReferenceExecutionErrorObservation;

  constructor(observation: ReferenceExecutionErrorObservation) {
    super(observation.errorMessage ?? observation.statusMessage ?? "Apps Script execution failed");

    this.name = "ReferenceExecutionError";
    this.observation = observation;
  }
}
