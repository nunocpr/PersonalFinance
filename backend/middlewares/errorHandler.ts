import { type Request, type Response, type NextFunction } from 'express';

interface HttpError extends Error {
    status?: number;
}

// Option A: Export as default
const errorHandler = (
    error: HttpError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';
    res.status(status).json({ message });
};

export default errorHandler;