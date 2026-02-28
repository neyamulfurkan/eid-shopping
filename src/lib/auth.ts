// src/lib/auth.ts
import NextAuth, { type NextAuthConfig, type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

/**
 * Augment next-auth types to include id and role on session user and JWT token.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      role: Role;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
  }
}

/**
 * NextAuth v5 configuration with Credentials provider and JWT session strategy.
 * Only ADMIN role users may authenticate.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Validates submitted credentials against the database.
       * @param credentials - The submitted email and password fields.
       * @returns User object without password on success, null on failure.
       */
      async authorize(credentials) {
        if (
          typeof credentials?.email !== 'string' ||
          typeof credentials?.password !== 'string'
        ) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true,
            },
          });

          if (!user) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) return null;

          // Return user without the password hash — never include it in the token
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            role: user.role,
          };
        } catch {
          // Never throw — return null so NextAuth handles the failed auth gracefully
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    /**
     * Persists id and role into the JWT token on sign-in.
     * @param token - The current JWT payload.
     * @param user - Present only on initial sign-in.
     * @returns Updated JWT with id and role fields.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
      }
      return token;
    },

    /**
     * Exposes id and role on the session object from the JWT token.
     * @param session - The current session object.
     * @param token - The decoded JWT token.
     * @returns Session with id and role added to session.user.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Convenience wrapper around auth() for use in server components and route handlers.
 * @returns The current session or null if unauthenticated.
 */
export async function getServerSession() {
  return auth();
}