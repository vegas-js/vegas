import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { User } from "./User";

export function createUser(email: string, createObject?: CreateGasObject) {
  const implementation = new User(email);

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => implementation.getEmail(),
          writable: true,
        },
        {
          name: "getEmail",
          value: () => implementation.getEmail(),
          writable: true,
        },
        {
          name: "getUserLoginId",
          value: () => implementation.getUserLoginId(),
          writable: true,
        },
        {
          name: "getUsername",
          value: () => {
            throw new Error("User#getUsername() is not implemented.");
          },
          writable: true,
        },
      ],
    },
    createObject,
  ) as { getEmail: () => string; getUserLoginId: () => string };
}
