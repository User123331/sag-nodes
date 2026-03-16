export interface TasteDiveResult {
  readonly Name: string;
  readonly Type: string;
}

export interface TasteDiveResponse {
  readonly Similar: {
    readonly Info: ReadonlyArray<TasteDiveResult>;
    readonly Results: ReadonlyArray<TasteDiveResult>;
  };
}
