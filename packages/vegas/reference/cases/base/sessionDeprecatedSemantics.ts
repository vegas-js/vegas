function captureCall<T>(fn: () => T) {
  try {
    return {
      threw: false,
      value: fn(),
    };
  } catch (error) {
    return {
      threw: true,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export function captureReferenceSessionDeprecatedSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const session = globals.Session;

  const timeZone = captureCall(() => session.getTimeZone());
  const scriptTimeZone = captureCall(() => session.getScriptTimeZone());

  const user = captureCall(() => session.getUser());
  const activeUser = captureCall(() => session.getActiveUser());

  return {
    getTimeZone: {
      threw: timeZone.threw,
      sameAsScriptTimeZone:
        !timeZone.threw && !scriptTimeZone.threw && timeZone.value === scriptTimeZone.value,
      errorName: timeZone.threw ? timeZone.errorName : null,
      errorMessage: timeZone.threw ? timeZone.errorMessage : null,
    },

    getUser: {
      threw: user.threw,
      sameEmailAsActiveUser:
        !user.threw && !activeUser.threw && user.value.getEmail() === activeUser.value.getEmail(),
      errorName: user.threw ? user.errorName : null,
      errorMessage: user.threw ? user.errorMessage : null,
    },
  };
}
