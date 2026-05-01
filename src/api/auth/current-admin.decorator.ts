// JWT autentifikatsiyadan o'tgan adminning payload'ini handler param'iga injecting qiladi.
// Foydalanish: methodName(@CurrentAdmin() admin: JwtPayload) { ... }

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from './jwt.strategy';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return req.user;
  },
);
