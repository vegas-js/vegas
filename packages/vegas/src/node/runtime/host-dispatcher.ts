import type { DriveHostCallHandler } from "./drive-host-handler";
import type { HostCall, HostCallResult } from "./host-call";
import type { PropertiesHostCallHandler } from "./properties-host-handler";

export interface HostCallDispatcher {
  dispatch<C extends HostCall>(call: C): Promise<HostCallResult<C>>;
}

export interface HostDispatcherOptions {
  readonly drive?: DriveHostCallHandler;
  readonly properties: PropertiesHostCallHandler;
}

export class HostDispatcher implements HostCallDispatcher {
  readonly #drive: DriveHostCallHandler | undefined;
  readonly #properties: PropertiesHostCallHandler;

  constructor(options: HostDispatcherOptions) {
    this.#drive = options.drive;
    this.#properties = options.properties;
  }

  async dispatch<C extends HostCall>(call: C): Promise<HostCallResult<C>> {
    switch (call.service) {
      case "drive": {
        if (!this.#drive) {
          throw new Error("Drive host handler is not configured for this invocation.");
        }

        return (await this.#drive.handle(call)) as HostCallResult<C>;
      }
      case "properties": {
        return (await this.#properties.handle(call)) as HostCallResult<C>;
      }
    }
  }
}
