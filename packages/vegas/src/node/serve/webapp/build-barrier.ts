export interface WebAppBuildBarrier {
  waitForIdle(): Promise<void>;
}

export function createIdleWebAppBuildBarrier(): WebAppBuildBarrier {
  return {
    waitForIdle: () => Promise.resolve(),
  };
}
