let topLevelEvaluationCount = 0;
topLevelEvaluationCount += 1;

let entryInvocationCount = 0;

export function captureReferenceExecutionTopLevelLifecycle() {
  entryInvocationCount += 1;

  return {
    topLevelEvaluationCount,
    entryInvocationCount,
  };
}
