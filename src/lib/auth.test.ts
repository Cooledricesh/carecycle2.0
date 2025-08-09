import { authOptions } from './auth'
import { NextAuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import { Session } from 'next-auth'

describe('Auth Configuration', () => {
  describe('authOptions structure', () => {
    it('has correct base configuration', () => {
      expect(authOptions).toBeDefined()
      expect(authOptions.providers).toBeDefined()
      expect(Array.isArray(authOptions.providers)).toBe(true)
      expect(authOptions.pages).toBeDefined()
      expect(authOptions.callbacks).toBeDefined()
      expect(authOptions.session).toBeDefined()
    })

    it('has correct pages configuration', () => {
      expect(authOptions.pages).toEqual({
        signIn: '/auth/signin',
      })
    })

    it('uses JWT strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('has secret configured from environment', () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET)
    })

    it('has empty providers array by default', () => {
      expect(authOptions.providers).toEqual([])
    })
  })

  describe('Session Callback', () => {
    it('adds user ID to session when token is present', async () => {
      const mockSession: Session = {
        user: {
          id: '',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const mockToken: JWT = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: { ...mockSession.user, emailVerified: null }
      } as any)

      expect(result).toBeDefined()
      expect(result?.user?.id).toBe('user-123')
      expect(result?.user?.name).toBe('Test User')
      expect(result?.user?.email).toBe('test@example.com')
    })

    it('returns session unchanged when token is null', async () => {
      const mockSession: Session = {
        user: {
          id: '',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: null as any,
        user: { ...mockSession.user, emailVerified: null }
      } as any)

      expect(result).toBeDefined()
      expect(result?.user?.id).toBe('')
      expect(result?.user?.name).toBe('Test User')
      expect(result?.user?.email).toBe('test@example.com')
    })

    it('returns session unchanged when token is undefined', async () => {
      const mockSession: Session = {
        user: {
          id: '',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: undefined as any,
        user: { ...mockSession.user, emailVerified: null }
      } as any)

      expect(result).toEqual(mockSession)
    })

    it('handles session with missing user gracefully', async () => {
      const mockSession: Session = {
        user: {} as any,
        expires: '2024-12-31'
      }

      const mockToken: JWT = {
        sub: 'user-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: {} as any
      } as any)

      expect(result).toBeDefined()
      expect(result?.user?.id).toBe('user-123')
    })

    it('handles empty token sub gracefully', async () => {
      const mockSession: Session = {
        user: {
          id: '',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const mockToken: JWT = {
        sub: '',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: { ...mockSession.user, emailVerified: null }
      } as any)

      expect(result).toBeDefined()
      expect(result?.user?.id).toBe('')
    })

    it('handles undefined token sub gracefully', async () => {
      const mockSession: Session = {
        user: {
          id: 'original-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const mockToken: JWT = {
        sub: undefined as any,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: { ...mockSession.user, emailVerified: null }
      } as any)

      expect(result).toBeDefined()
      // When token.sub is undefined, casting as string makes it "undefined"
      expect(result?.user?.id).toBe(undefined)
    })
  })

  describe('JWT Callback', () => {
    it('adds user ID to token when user is present', async () => {
      const mockToken: JWT = {
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser,
        account: null,
        profile: undefined
      } as any)

      expect(result).toBeDefined()
      expect(result?.sub).toBe('user-123')
    })

    it('returns token unchanged when user is undefined', async () => {
      const mockToken: JWT = {
        sub: 'existing-id',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: undefined as any,
        account: null,
        profile: undefined
      } as any)

      expect(result).toBeDefined()
      expect(result?.sub).toBe('existing-id')
    })

    it('returns token unchanged when user is null', async () => {
      const mockToken: JWT = {
        sub: 'existing-id',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: null as any,
        account: null,
        profile: undefined
      } as any)

      expect(result).toEqual(mockToken)
    })

    it('handles user with no ID gracefully', async () => {
      const mockToken: JWT = {
        sub: 'existing-id',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const mockUser = {
        name: 'Test User',
        email: 'test@example.com'
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser as any,
        account: null,
        profile: undefined
      } as any)

      expect(result).toEqual(mockToken)
    })
  })
})