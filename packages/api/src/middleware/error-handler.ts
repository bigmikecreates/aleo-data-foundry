import type { FastifyError } from "fastify";
import type { FastifyRequest, FastifyReply } from "fastify";
import { NotFoundError, ValidationError, UnauthorizedError } from "../errors.js";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  let statusCode = error.statusCode ?? 500;
  let code = (error as { code?: string }).code ?? "INTERNAL_ERROR";

  if (error instanceof NotFoundError) {
    statusCode = 404;
    code = "NOT_FOUND";
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
  } else if (error instanceof UnauthorizedError) {
    statusCode = 401;
    code = "UNAUTHORIZED";
  }

  reply.status(statusCode).send({
    error: {
      code,
      message: error.message,
    },
  });
}
