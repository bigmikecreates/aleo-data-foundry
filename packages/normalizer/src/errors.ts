export class NormalizationError extends Error {
  public readonly entityType: string;
  public readonly context: unknown;

  constructor(entityType: string, message: string, context?: unknown) {
    super(message);
    this.name = "NormalizationError";
    this.entityType = entityType;
    this.context = context;
  }
}
