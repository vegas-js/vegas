// https://developers.google.com/apps-script/reference/properties/properties-service
export type PropertiesNamespace =
  | {
      readonly kind: "script";
      readonly scriptKey: string;
    }
  | {
      readonly kind: "user";
      readonly scriptKey: string;
      readonly userKey: string;
    }
  | {
      readonly kind: "document";
      readonly scriptKey: string;
      readonly documentKey: string;
    };

// https://developers.google.com/apps-script/reference/properties/properties
export interface PropertiesStore {
  get(namespace: PropertiesNamespace, key: string): Promise<string | undefined>;

  getAll(namespace: PropertiesNamespace): Promise<Record<string, string>>;

  set(namespace: PropertiesNamespace, key: string, value: string): Promise<void>;

  setAll(
    namespace: PropertiesNamespace,
    properties: Readonly<Record<string, string>>,
  ): Promise<void>;

  replaceAll(
    namespace: PropertiesNamespace,
    properties: Readonly<Record<string, string>>,
  ): Promise<void>;

  remove(namespace: PropertiesNamespace, key: string): Promise<void>;

  clear(namespace: PropertiesNamespace): Promise<void>;
}
