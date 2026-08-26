export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
  toJSON() {
    return { ok: false, error: { code: this.code, message: this.message, ...this.details } };
  }
}

export const toApiError = (e: unknown): ApiError => {
  if (e instanceof ApiError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  return new ApiError(500, "INTERNAL", msg);
};
