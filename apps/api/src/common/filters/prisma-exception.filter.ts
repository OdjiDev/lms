import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Traduit les erreurs Prisma connues en réponses HTTP propres. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const mapping: Record<string, { status: number; message: string }> = {
      P2002: { status: HttpStatus.CONFLICT, message: 'Cette valeur existe déjà' },
      P2003: { status: HttpStatus.BAD_REQUEST, message: 'Référence inexistante' },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'Ressource introuvable' },
    };

    const mapped = mapping[exception.code];
    if (mapped) {
      response.status(mapped.status).json({
        statusCode: mapped.status,
        message: mapped.message,
        code: exception.code,
      });
      return;
    }

    this.logger.error(`Erreur Prisma non gérée (${exception.code})`, exception.message);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erreur interne',
    });
  }
}
