import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export interface PartnerAuthRequest extends AuthRequest {
  party?: any;
  isAdmin?: boolean;
  isApiKeyAuth?: boolean;
}

/**
 * Middleware that authenticates external API requests via either:
 * 1. Admin Master API Key / User API Key (Header `x-api-key`, `X-API-Key`, or Query `apiKey`)
 * 2. Partner Agency API Key (Header `x-api-key`, `X-API-Key`, or Query `apiKey`)
 * 3. Bearer JWT Access Token (Header `Authorization: Bearer <token>`)
 */
export const partnerAuthenticate = async (
  req: PartnerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = (
      req.headers['x-api-key'] ||
      req.headers['x-apikey'] ||
      req.headers['X-API-KEY'] ||
      req.query.apiKey ||
      req.query.api_key
    ) as string | undefined;

    // 1. Try API Key Authentication
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      const cleanKey = apiKey.trim();

      // 1A. Check if this is an Admin or User API Key
      const user = await prisma.user.findFirst({
        where: {
          apiKey: cleanKey,
          isActive: true
        },
        include: {
          party: {
            include: { accountCurrency: true }
          }
        }
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role as any,
          partyId: user.party?.id
        };
        req.isAdmin = (user.role === 'admin');
        req.isApiKeyAuth = true;
        if (user.party) {
          req.party = user.party;
        }
        return next();
      }

      // 1B. Check if this is a Partner Agency API Key (or party code)
      const party = await prisma.party.findFirst({
        where: {
          OR: [
            { apiKey: cleanKey },
            { partyCode: cleanKey }
          ],
          isCustomer: true
        },
        include: {
          accountCurrency: true,
        }
      });

      if (party) {
        req.party = party;
        req.isAdmin = false;
        req.isApiKeyAuth = true;
        req.user = {
          id: party.userId || 'api-partner-system',
          email: party.email,
          role: 'partner' as any,
          partyId: party.id
        };
        return next();
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid API Key provided',
        code: 'INVALID_API_KEY',
        message: 'The provided API key does not match any active Admin account or registered partner agency.'
      });
    }

    // 2. Try Bearer JWT Authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      let payload: any;
      try {
        payload = verifyAccessToken(token);
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Bearer token',
          code: 'TOKEN_EXPIRED'
        });
      }

      req.user = payload;
      req.isAdmin = (payload.role === 'admin');

      // Look up party linked to this user account if applicable
      const linkedParty = await prisma.party.findFirst({
        where: {
          OR: [
            { userId: payload.id },
            { email: payload.email }
          ],
          isCustomer: true
        },
        include: {
          accountCurrency: true
        }
      });

      if (linkedParty) {
        req.party = linkedParty;
      }

      return next();
    }

    // No credentials provided
    return res.status(401).json({
      success: false,
      error: 'Authentication credentials required',
      code: 'AUTH_REQUIRED',
      message: 'Please provide a valid API Key in the `x-api-key` header or a Bearer token in the `Authorization` header.'
    });
  } catch (error: any) {
    console.error('[PARTNER AUTH ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error',
      details: error.message
    });
  }
};
