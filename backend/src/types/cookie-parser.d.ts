declare module 'cookie-parser' {
  import { RequestHandler } from 'express';

  type CookieParseOptions = {
    decode?: (value: string) => string;
  };

  type CookieSerializeOptions = {
    maxAge?: number;
    signed?: boolean;
    expires?: Date;
    httpOnly?: boolean;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
    encode?: (value: string) => string;
  };

  interface CookieParser {
    (secret?: string | string[], options?: CookieParseOptions): RequestHandler;
    JSONCookie: (val: string) => object | string;
    JSONCookies: (val: Record<string, string>) => Record<string, object | string>;
    signedCookie: (val: string, secret?: string | string[]) => string | false;
    signedCookies: (val: Record<string, string>, secret?: string | string[]) => Record<string, string>;
  }

  const cookieParser: CookieParser;
  export = cookieParser;
}

declare namespace Express {
  interface Request {
    cookies: Record<string, string>;
    signedCookies: Record<string, string>;
  }
}

