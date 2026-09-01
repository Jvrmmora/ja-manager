import { Response } from 'express';
import {
  ErrorHandler,
  ValidationError,
  NotFoundError,
} from './errorHandler';

const makeRes = () => {
  const res = {} as Response & { statusCode?: number; body?: any };
  res.status = jest.fn().mockImplementation((code: number) => {
    (res as any).statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: any) => {
    (res as any).body = payload;
    return res;
  });
  res.headersSent = false;
  return res;
};

describe('ErrorHandler', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('no filtra el stack trace en producción para errores no controlados', () => {
    process.env.NODE_ENV = 'production';
    const res = makeRes();

    ErrorHandler.handleError(new Error('detalle interno sensible'), {}, res);

    expect((res as any).statusCode).toBe(500);
    expect((res as any).body.error.message).toBe('Error interno del servidor');
    expect((res as any).body.error.stack).toBeUndefined();
    expect(JSON.stringify((res as any).body)).not.toContain('sensible');
  });

  it('mapea AppError a su statusCode y mensaje', () => {
    const res = makeRes();
    ErrorHandler.handleError(new NotFoundError('Joven', 'abc'), {}, res);

    expect((res as any).statusCode).toBe(404);
    expect((res as any).body.success).toBe(false);
  });

  it('convierte errores de duplicado de Mongo (11000) en 409', () => {
    const res = makeRes();
    const dupError: any = new Error('E11000');
    dupError.code = 11000;
    dupError.keyValue = { email: 'a@b.com' };

    ErrorHandler.handleError(dupError, {}, res);
    expect((res as any).statusCode).toBe(409);
  });

  it('ValidationError incluye los detalles proporcionados', () => {
    const res = makeRes();
    ErrorHandler.handleError(
      new ValidationError('Datos inválidos', { fields: ['phone'] }),
      {},
      res
    );

    expect((res as any).statusCode).toBe(400);
    expect((res as any).body.error.details).toEqual({ fields: ['phone'] });
  });
});
