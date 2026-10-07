export interface Program {
  readonly source: string;
  readonly htmlFiles: Readonly<Record<string, string>>;
}
