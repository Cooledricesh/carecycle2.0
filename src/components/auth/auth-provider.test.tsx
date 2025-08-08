import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
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

  it('renders children regardless of loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    // AuthProvider is a simple wrapper that always renders children
    // Loading state handling is the responsibility of consuming components
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('renders children when user is unauthenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <AuthProvider>
        <div data-testid="protected-content">Protected Content</div>
      </AuthProvider>
    )

    // AuthProvider just wraps SessionProvider, doesn't handle authentication logic
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
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
    // When session is expired, NextAuth typically returns null data with unauthenticated status
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const TestComponent = () => {
      const session = useSession()
      
      // Component should handle expired session appropriately
      if (session.status === 'unauthenticated') {
        return (
          <div data-testid="session-expired">
            Session expired. Please log in again.
          </div>
        )
      }
      
      return <div data-testid="protected-content">Protected Content</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Verify that the session hook was called
    expect(mockUseSession).toHaveBeenCalled()
    
    // Verify that expired session results in unauthenticated state
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('session-expired')).toBeInTheDocument()
    expect(screen.getByTestId('session-expired')).toHaveTextContent('Session expired. Please log in again.')
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

  it('handles session update functionality', () => {
    const mockUpdate = jest.fn()
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
      update: mockUpdate,
    })

    const TestComponent = () => {
      const session = useSession()
      return (
        <div>
          <div data-testid="user-name">{session.data?.user?.name}</div>
          <button 
            data-testid="update-session" 
            onClick={() => session.update()}
          >
            Update Session
          </button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
    
    const updateButton = screen.getByTestId('update-session')
    fireEvent.click(updateButton)
    
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('provides different session statuses correctly', () => {
    const TestComponent = () => {
      const session = useSession()
      return (
        <div data-testid="session-status">
          Status: {session.status}
        </div>
      )
    }

    // Test loading status
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    })

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-status')).toHaveTextContent('Status: loading')

    // Test authenticated status
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-status')).toHaveTextContent('Status: authenticated')

    // Test unauthenticated status
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-status')).toHaveTextContent('Status: unauthenticated')
  })

  it('handles malformed session data gracefully', () => {
    // Test with completely malformed data
    mockUseSession.mockReturnValue({
      data: 'invalid-data',
      status: 'authenticated',
    })

    const TestComponent = () => {
      const session = useSession()
      return (
        <div data-testid="session-data">
          {JSON.stringify(session.data)}
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should render without crashing
    expect(screen.getByTestId('session-data')).toHaveTextContent('"invalid-data"')
  })

  it('handles session with missing expires field', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        // missing expires field
      },
      status: 'authenticated',
    })

    const TestComponent = () => {
      const session = useSession()
      return (
        <div data-testid="expires-info">
          Expires: {session.data?.expires || 'not set'}
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('expires-info')).toHaveTextContent('Expires: not set')
  })

  it('handles nested components with session context', () => {
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

    const GrandchildComponent = () => {
      const session = useSession()
      return (
        <div data-testid="grandchild-email">
          {session.data?.user?.email}
        </div>
      )
    }

    const ChildComponent = () => {
      return (
        <div>
          <div data-testid="child-component">Child Component</div>
          <GrandchildComponent />
        </div>
      )
    }

    render(
      <AuthProvider>
        <ChildComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(screen.getByTestId('grandchild-email')).toHaveTextContent('test@example.com')
  })

  it('works with multiple child components using session', () => {
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

    const Component1 = () => {
      const session = useSession()
      return <div data-testid="comp1">{session.data?.user?.name}</div>
    }

    const Component2 = () => {
      const session = useSession()
      return <div data-testid="comp2">{session.data?.user?.email}</div>
    }

    const Component3 = () => {
      const session = useSession()
      return <div data-testid="comp3">{session.data?.user?.id}</div>
    }

    render(
      <AuthProvider>
        <Component1 />
        <Component2 />
        <Component3 />
      </AuthProvider>
    )

    expect(screen.getByTestId('comp1')).toHaveTextContent('Test User')
    expect(screen.getByTestId('comp2')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('comp3')).toHaveTextContent('1')
  })

  it('handles rapid session status changes', () => {
    const TestComponent = () => {
      const session = useSession()
      return (
        <div data-testid="session-info">
          Status: {session.status}, User: {session.data?.user?.email || 'none'}
        </div>
      )
    }

    // Start with loading
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    })

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-info')).toHaveTextContent('Status: loading, User: none')

    // Quickly change to authenticated
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-info')).toHaveTextContent('Status: authenticated, User: test@example.com')

    // Quickly change to unauthenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-info')).toHaveTextContent('Status: unauthenticated, User: none')
  })

  it('provides session context with proper type safety', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    const TestComponent = () => {
      const session = useSession()
      
      // Test that all expected properties are available
      return (
        <div>
          <div data-testid="user-id">{session.data?.user?.id}</div>
          <div data-testid="user-email">{session.data?.user?.email}</div>
          <div data-testid="user-name">{session.data?.user?.name}</div>
          <div data-testid="user-image">{session.data?.user?.image}</div>
          <div data-testid="session-expires">{session.data?.expires}</div>
          <div data-testid="session-status">{session.status}</div>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-id')).toHaveTextContent('1')
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
    expect(screen.getByTestId('user-image')).toHaveTextContent('https://example.com/avatar.jpg')
    expect(screen.getByTestId('session-expires')).toHaveTextContent('2024-12-31')
    expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated')
  })

  it('handles edge case with empty user object', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {},
        expires: '2024-12-31',
      },
      status: 'authenticated',
    })

    const TestComponent = () => {
      const session = useSession()
      return (
        <div data-testid="user-info">
          ID: {session.data?.user?.id || 'none'}
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-info')).toHaveTextContent('ID: none')
  })

  it('handles provider remounting without losing session state', () => {
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

    const TestComponent = () => {
      const session = useSession()
      return (
        <div data-testid="user-name">{session.data?.user?.name}</div>
      )
    }

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')

    // Unmount and remount
    unmount()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should still work after remounting
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
  })
})