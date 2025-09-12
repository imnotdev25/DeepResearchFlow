import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Use our storage interface for the hybrid ID approach
  const userData = {
    replitSubId: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  };
  
  return await storage.upsertReplitUser(userData);
}

export async function setupAuth(app: Express) {
  // Validate required environment variables
  if (!process.env.REPLIT_DOMAINS) {
    throw new Error("Missing required environment variable: REPLIT_DOMAINS");
  }
  if (!process.env.REPL_ID) {
    throw new Error("Missing required environment variable: REPL_ID");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("Missing required environment variable: SESSION_SECRET");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    
    // Store the database user for our hybrid system
    const dbUser = await upsertUser(tokens.claims());
    (user as any).dbUser = dbUser;
    
    updateUserSession(user, tokens);
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Find matching domain or use first as fallback
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const matchedDomain = domains.find(domain => req.hostname.includes(domain)) || domains[0];
    
    passport.authenticate(`replitauth:${matchedDomain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Find matching domain or use first as fallback
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const matchedDomain = domains.find(domain => req.hostname.includes(domain)) || domains[0];
    
    passport.authenticate(`replitauth:${matchedDomain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Set userId for our hybrid system compatibility
    (req as any).userId = user.dbUser?.id;
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    // Set userId for our hybrid system compatibility
    (req as any).userId = user.dbUser?.id;
    // Persist refreshed tokens in session
    (req as any).login(user, (err: any) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Optional auth middleware for endpoints that work with or without auth
export const optionalAuth: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (req.isAuthenticated() && user && user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      // Set userId for authenticated users
      (req as any).userId = user.dbUser?.id;
    }
  }
  
  next();
};