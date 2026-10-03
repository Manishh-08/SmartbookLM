// This is only required for express 4, also just because we have to catch the error
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";



type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;


export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
      void handler(req, res, next).catch(next);
  };
}