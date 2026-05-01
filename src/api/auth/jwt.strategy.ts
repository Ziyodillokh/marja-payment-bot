import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // admin cuid
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not configured');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // payload.sub — string (cuid). Eski token (Int sub) keladigan bo'lsa,
    // Prisma'ga noto'g'ri tip bormaydi, 401 qaytaramiz.
    if (typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid token format — please re-login');
    }
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
      });
      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Admin not active');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // Prisma xatolari (validation, connection) — 401 ga aylantiramiz.
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
