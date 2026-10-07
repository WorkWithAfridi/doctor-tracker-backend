export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string> | null = null,
  ) {
    super(message);
  }
}
