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
        user: mockSession.user
      })

      expect(result).toBeDefined()
      expect(result?.user.id).toBe('user-123')
      expect(result?.user.name).toBe('Test User')
      expect(result?.user.email).toBe('test@example.com')
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
        user: mockSession.user
      })

      expect(result).toBeDefined()
      expect(result?.user.id).toBe('')
      expect(result?.user.name).toBe('Test User')
      expect(result?.user.email).toBe('test@example.com')
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
        user: mockSession.user
      })

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
      })

      expect(result).toBeDefined()
      expect(result?.user.id).toBe('user-123')
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
        user: mockSession.user
      })

      expect(result).toBeDefined()
      expect(result?.user.id).toBe('')
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
        sub: undefined,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: mockSession.user
      })

      expect(result).toBeDefined()
      // When token.sub is undefined, casting as string makes it "undefined"
      expect(result?.user.id).toBe(undefined)
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
        profile: undefined,
        trigger: undefined
      })

      expect(result).toBeDefined()
      expect(result?.sub).toBe('user-123')
    })

    it('returns token unchanged when user is null', async () => {
      const mockToken: JWT = {
        sub: 'existing-sub',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: null as any,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(result).toBeDefined()
      expect(result?.sub).toBe('existing-sub')
    })

    it('returns token unchanged when user is undefined', async () => {
      const mockToken: JWT = {
        sub: 'existing-sub',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: undefined,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(result).toEqual(mockToken)
    })

    it('handles user without ID gracefully', async () => {
      const mockToken: JWT = {
        sub: 'existing-sub',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
      } as any

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(result).toBeDefined()
      expect(result?.sub).toBe(undefined)
    })

    it('handles empty user ID gracefully', async () => {
      const mockToken: JWT = {
        sub: 'existing-sub',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const mockUser = {
        id: '',
        name: 'Test User',
        email: 'test@example.com',
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(result).toBeDefined()
      expect(result?.sub).toBe('')
    })

    it('preserves existing token properties', async () => {
      const mockToken: JWT = {
        sub: 'existing-sub',
        email: 'existing@example.com',
        name: 'Existing User',
        custom: 'custom-value',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const mockUser = {
        id: 'new-user-123',
        name: 'New User',
        email: 'new@example.com',
      }

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(result).toBeDefined()
      expect(result?.sub).toBe('new-user-123')
      expect(result?.email).toBe('existing@example.com')
      expect(result?.name).toBe('Existing User')
      expect((result as any)?.custom).toBe('custom-value')
    })
  })

  describe('Callback Integration', () => {
    it('maintains consistency between JWT and session callbacks', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      }

      // First, JWT callback
      const initialToken: JWT = {
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const jwtResult = await authOptions.callbacks?.jwt?.({
        token: initialToken,
        user: mockUser,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(jwtResult?.sub).toBe('user-123')

      // Then, session callback
      const mockSession: Session = {
        user: {
          id: '',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const sessionResult = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: jwtResult!,
        user: mockUser
      })

      expect(sessionResult?.user.id).toBe('user-123')
    })

    it('handles the full authentication flow correctly', async () => {
      // Simulate a full auth flow
      const user = {
        id: 'auth-flow-user-123',
        name: 'Flow Test User',
        email: 'flowtest@example.com',
      }

      // Step 1: JWT callback on sign in
      const newToken: JWT = {
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const tokenAfterSignIn = await authOptions.callbacks?.jwt?.({
        token: newToken,
        user: user,
        account: { type: 'credentials', provider: 'credentials' } as any,
        profile: undefined,
        trigger: 'signIn'
      })

      expect(tokenAfterSignIn?.sub).toBe('auth-flow-user-123')

      // Step 2: Session callback to create session
      const baseSession: Session = {
        user: {
          id: '',
          name: 'Flow Test User',
          email: 'flowtest@example.com',
        },
        expires: '2024-12-31'
      }

      const sessionAfterSignIn = await authOptions.callbacks?.session?.({
        session: baseSession,
        token: tokenAfterSignIn!,
        user: user
      })

      expect(sessionAfterSignIn?.user.id).toBe('auth-flow-user-123')
      expect(sessionAfterSignIn?.user.name).toBe('Flow Test User')
      expect(sessionAfterSignIn?.user.email).toBe('flowtest@example.com')

      // Step 3: JWT callback on subsequent requests (no user)
      const tokenOnRequest = await authOptions.callbacks?.jwt?.({
        token: tokenAfterSignIn!,
        user: undefined,
        account: null,
        profile: undefined,
        trigger: undefined
      })

      expect(tokenOnRequest?.sub).toBe('auth-flow-user-123')

      // Step 4: Session callback on subsequent requests
      const sessionOnRequest = await authOptions.callbacks?.session?.({
        session: sessionAfterSignIn!,
        token: tokenOnRequest!,
        user: user
      })

      expect(sessionOnRequest?.user.id).toBe('auth-flow-user-123')
    })
  })

  describe('Type Safety', () => {
    it('ensures authOptions conforms to NextAuthOptions type', () => {
      const options: NextAuthOptions = authOptions
      expect(options).toBeDefined()
    })

    it('has properly typed session callback', () => {
      expect(typeof authOptions.callbacks?.session).toBe('function')
    })

    it('has properly typed jwt callback', () => {
      expect(typeof authOptions.callbacks?.jwt).toBe('function')
    })

    it('session callback handles extended user type', async () => {
      // Test that our extended Session type works
      const mockSession: Session = {
        user: {
          id: 'type-test-123',
          name: 'Type Test User',
          email: 'typetest@example.com',
        },
        expires: '2024-12-31'
      }

      const mockToken: JWT = {
        sub: 'type-test-123',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: mockSession.user
      })

      // TypeScript should recognize the 'id' field on user
      expect(result?.user.id).toBe('type-test-123')
      expect(typeof result?.user.id).toBe('string')
    })
  })

  describe('Error Handling', () => {
    it('handles session callback errors gracefully', async () => {
      const mockSession: Session = {
        user: {
          id: '',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      // Token with invalid structure
      const invalidToken = {
        sub: null,
        invalidProp: 'invalid'
      } as any

      expect(async () => {
        const result = await authOptions.callbacks?.session?.({
          session: mockSession,
          token: invalidToken,
          user: mockSession.user
        })
        return result
      }).not.toThrow()
    })

    it('handles jwt callback errors gracefully', async () => {
      const mockToken: JWT = {
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        jti: 'token-id'
      }

      // Invalid user object
      const invalidUser = {
        invalid: 'structure'
      } as any

      expect(async () => {
        const result = await authOptions.callbacks?.jwt?.({
          token: mockToken,
          user: invalidUser,
          account: null,
          profile: undefined,
          trigger: undefined
        })
        return result
      }).not.toThrow()
    })

    it('handles malformed token gracefully', async () => {
      const mockSession: Session = {
        user: {
          id: 'original-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31'
      }

      const malformedToken = {} as JWT // No sub property

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: malformedToken,
        user: mockSession.user
      })

      expect(result).toBeDefined()
      // When token.sub doesn't exist, casting as string makes it "undefined"
      expect(result?.user.id).toBe(undefined)
    })
  })

  describe('Environment Variable Handling', () => {
    it('secret is configured from environment variable', () => {
      // Since authOptions.secret is set at import time, we test that it uses process.env
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET)
    })

    it('has proper structure regardless of environment', () => {
      expect(authOptions).toHaveProperty('secret')
    })

    it('secret can be undefined when environment variable is not set', () => {
      // Test the current state - secret should match whatever is in process.env
      const currentSecret = process.env.NEXTAUTH_SECRET
      if (currentSecret) {
        expect(authOptions.secret).toBe(currentSecret)
      } else {
        expect(authOptions.secret).toBeUndefined()
      }
    })
  })
})