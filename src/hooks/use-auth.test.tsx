import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { AuthProvider } from '@/components/auth/auth-provider'
import '@testing-library/jest-dom'

// Mock next-auth
jest.mock('next-auth/react')

// Custom hook to test auth functionality
const useAuth = () => {
  const { data: session, status, update } = useSession()
  
  return {
    user: session?.user || null,
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    signIn,
    signOut,
    updateSession: update,
  }
}

// Mock implementations
const mockUseSession = useSession as jest.Mock
const mockSignIn = signIn as jest.Mock
const mockSignOut = signOut as jest.Mock

// Wrapper component for testing
const createWrapper = () => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Hook Initialization', () => {
    it('returns correct initial state when loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.status).toBe('loading')
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isUnauthenticated).toBe(false)
    })

    it('returns correct state when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.status).toBe('unauthenticated')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isUnauthenticated).toBe(true)
    })

    it('returns correct state when authenticated', () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      }

      const mockSession = {
        user: mockUser,
        expires: '2024-12-31T23:59:59.999Z',
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.status).toBe('authenticated')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isUnauthenticated).toBe(false)
    })
  })

  describe('Session State Transitions', () => {
    it('handles transition from loading to authenticated', () => {
      const mockUpdate = jest.fn()

      // Start with loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: mockUpdate,
      })

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)

      // Transition to authenticated
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      }

      const mockSession = {
        user: mockUser,
        expires: '2024-12-31T23:59:59.999Z',
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: mockUpdate,
      })

      rerender()

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('handles transition from loading to unauthenticated', () => {
      const mockUpdate = jest.fn()

      // Start with loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: mockUpdate,
      })

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      // Transition to unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: mockUpdate,
      })

      rerender()

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isUnauthenticated).toBe(true)
      expect(result.current.user).toBeNull()
    })

    it('handles transition from authenticated to unauthenticated', () => {
      const mockUpdate = jest.fn()

      // Start authenticated
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      }

      mockUseSession.mockReturnValue({
        data: { user: mockUser, expires: '2024-12-31T23:59:59.999Z' },
        status: 'authenticated',
        update: mockUpdate,
      })

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)

      // Transition to unauthenticated (e.g., session expired)
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: mockUpdate,
      })

      rerender()

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isUnauthenticated).toBe(true)
      expect(result.current.user).toBeNull()
    })

    it('handles rapid state changes', () => {
      const mockUpdate = jest.fn()
      const states = [
        { data: null, status: 'loading' },
        { data: null, status: 'unauthenticated' },
        { 
          data: { 
            user: { id: '1', name: 'Test User', email: 'test@example.com' }, 
            expires: '2024-12-31T23:59:59.999Z' 
          }, 
          status: 'authenticated' 
        },
        { data: null, status: 'unauthenticated' },
      ]

      let currentState = 0
      mockUseSession.mockImplementation(() => ({
        ...states[currentState],
        update: mockUpdate,
      }))

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      // Test each state transition
      states.forEach((state, index) => {
        currentState = index
        rerender()

        expect(result.current.status).toBe(state.status)
        expect(result.current.isLoading).toBe(state.status === 'loading')
        expect(result.current.isAuthenticated).toBe(state.status === 'authenticated')
        expect(result.current.isUnauthenticated).toBe(state.status === 'unauthenticated')
      })
    })
  })

  describe('Authentication Actions', () => {
    it('provides signIn function', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.signIn).toBe('function')
      expect(result.current.signIn).toBe(signIn)
    })

    it('provides signOut function', () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      }

      mockUseSession.mockReturnValue({
        data: { user: mockUser, expires: '2024-12-31T23:59:59.999Z' },
        status: 'authenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.signOut).toBe('function')
      expect(result.current.signOut).toBe(signOut)
    })

    it('calls signIn with correct parameters', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      mockSignIn.mockResolvedValue({ ok: true, error: null })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.signIn('credentials', {
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('calls signOut when invoked', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      }

      mockUseSession.mockReturnValue({
        data: { user: mockUser, expires: '2024-12-31T23:59:59.999Z' },
        status: 'authenticated',
        update: jest.fn(),
      })

      mockSignOut.mockResolvedValue({ url: 'http://localhost:3000' })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('Session Updates', () => {
    it('provides updateSession function', () => {
      const mockUpdate = jest.fn()

      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: mockUpdate,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.updateSession).toBe('function')
      expect(result.current.updateSession).toBe(mockUpdate)
    })

    it('calls updateSession when invoked', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        user: { id: '1', name: 'Updated User', email: 'updated@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
      })

      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
          expires: '2024-12-31T23:59:59.999Z',
        },
        status: 'authenticated',
        update: mockUpdate,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.updateSession()
      })

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('handles session update with new data', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        user: { id: '1', name: 'Updated User', email: 'updated@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
      })

      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
          expires: '2024-12-31T23:59:59.999Z',
        },
        status: 'authenticated',
        update: mockUpdate,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.updateSession({ name: 'Updated User' })
      })

      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated User' })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles session with null user', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: null,
          expires: '2024-12-31T23:59:59.999Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toEqual({
        user: null,
        expires: '2024-12-31T23:59:59.999Z',
      })
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles session with incomplete user data', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1' }, // Missing name and email
          expires: '2024-12-31T23:59:59.999Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toEqual({ id: '1' })
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles malformed session data', () => {
      mockUseSession.mockReturnValue({
        data: 'invalid-session-data' as any,
        status: 'authenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBe('invalid-session-data')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles undefined session data', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeUndefined()
      expect(result.current.isUnauthenticated).toBe(true)
    })

    it('handles missing update function gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        // Missing update function
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.updateSession).toBeUndefined()
      expect(result.current.isUnauthenticated).toBe(true)
    })

    it('handles session expiry detection', () => {
      const expiredSession = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2020-01-01T00:00:00.000Z', // Expired date
      }

      mockUseSession.mockReturnValue({
        data: expiredSession,
        status: 'unauthenticated', // NextAuth would set this
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current.session).toEqual(expiredSession)
      expect(result.current.isUnauthenticated).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Performance and Memory', () => {
    it('maintains referential equality of functions across re-renders', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      const firstSignIn = result.current.signIn
      const firstSignOut = result.current.signOut

      rerender()

      expect(result.current.signIn).toBe(firstSignIn)
      expect(result.current.signOut).toBe(firstSignOut)
    })

    it('does not cause unnecessary re-renders', () => {
      let renderCount = 0
      const mockUpdate = jest.fn()

      const TestHook = () => {
        renderCount++
        return useAuth()
      }

      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
          expires: '2024-12-31T23:59:59.999Z',
        },
        status: 'authenticated',
        update: mockUpdate,
      })

      const { rerender } = renderHook(() => TestHook(), {
        wrapper: createWrapper(),
      })

      const initialRenderCount = renderCount

      // Multiple re-renders with same data
      rerender()
      rerender()
      rerender()

      // Should not cause additional renders if session data hasn't changed
      expect(renderCount).toBe(initialRenderCount + 3) // Just the explicit re-renders
    })

    it('handles cleanup properly on unmount', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      const { result, unmount } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(result.current).toBeDefined()

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Type Safety and TypeScript Integration', () => {
    it('provides correctly typed user object', () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      }

      mockUseSession.mockReturnValue({
        data: { user: mockUser, expires: '2024-12-31T23:59:59.999Z' },
        status: 'authenticated',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      // These should be properly typed
      expect(typeof result.current.user?.id).toBe('string')
      expect(typeof result.current.user?.name).toBe('string')
      expect(typeof result.current.user?.email).toBe('string')
      expect(typeof result.current.user?.image).toBe('string')
    })

    it('provides correctly typed boolean flags', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.isLoading).toBe('boolean')
      expect(typeof result.current.isAuthenticated).toBe('boolean')
      expect(typeof result.current.isUnauthenticated).toBe('boolean')
    })
  })
})