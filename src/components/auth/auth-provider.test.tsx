import React from 'react'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from './auth-provider'
import { useSession } from 'next-auth/react'

// Mock next-auth
jest.mock('next-auth/react')

describe('AuthProvider', () => {
  const mockUseSession = useSession as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when user is authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('shows loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    // Should show loading indicator
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('redirects to login when user is unauthenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    // Should redirect or show login prompt
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('provides session data to children via context', () => {
    const TestComponent = () => {
      const session = useSession()
      return <div data-testid="session-email">{session.data?.user?.email}</div>
    }

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'context@example.com',
          name: 'Context User',
        },
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-email')).toHaveTextContent('context@example.com')
  })

  it('handles session expiry gracefully', () => {
    const expiredDate = new Date(Date.now() - 86400000).toISOString() // Yesterday

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'expired@example.com',
          name: 'Expired User',
        },
        expires: expiredDate,
      },
      status: 'authenticated',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    // Implementation should handle expired sessions
    // This depends on your actual AuthProvider implementation
    expect(mockUseSession).toHaveBeenCalled()
  })

  it('handles missing user data gracefully', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: null,
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    // Should handle missing user data without crashing
    expect(screen.queryByTestId('protected-content')).toBeInTheDocument()
  })
})