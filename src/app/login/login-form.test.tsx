import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { signIn } from 'next-auth/react'
import LoginPage from './page'

// Use the mocks from jest.setup.js
const mockSignIn = signIn as jest.Mock

// Mock the router push function
const mockPush = jest.fn()

// Override the router mock to include our push function
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    reload: jest.fn(),
    forward: jest.fn(),
    pathname: '/login',
    route: '/login',
    query: {},
    asPath: '/login',
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  describe('Component Rendering', () => {
    it('renders login form with all essential elements', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByText(/sign in to your account to continue/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('has proper form structure and accessibility attributes', () => {
      render(<LoginPage />)
      
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveAttribute('noValidate')
      
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('autoFocus')
      
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('submit button is initially enabled', () => {
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeEnabled()
      expect(submitButton).not.toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Form Validation', () => {
    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
      
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('shows validation error for short password', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
      
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('shows validation errors for both empty fields', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
      
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('clears validation errors when user fixes input', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // First, trigger validation error
      await user.type(emailInput, 'invalid')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
      
      // Then fix the input
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
      })
    })

    it('validates minimum password length correctly', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '1234567') // 7 characters, should fail
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
      
      // Now test with 8 characters
      await user.clear(passwordInput)
      await user.type(passwordInput, '12345678') // 8 characters, should pass
      
      await waitFor(() => {
        expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('calls signIn with correct credentials on valid form submission', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'test@example.com',
          password: 'password123',
          redirect: false,
        })
      })
    })

    it('redirects to dashboard on successful login', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      mockSignIn.mockImplementation(() => new Promise(resolve => {
        resolveSignIn = resolve
      }))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      const form = document.querySelector('form')!
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Check loading state
      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Signing in...')
        expect(submitButton).toBeDisabled()
        expect(form).toHaveAttribute('aria-busy', 'true')
        expect(emailInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
      })
      
      // Resolve the promise
      resolveSignIn!({ ok: true, error: null })
      
      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Sign In')
        expect(submitButton).toBeEnabled()
        expect(form).toHaveAttribute('aria-busy', 'false')
      })
    })

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      mockSignIn.mockImplementation(() => new Promise(resolve => {
        resolveSignIn = resolve
      }))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(emailInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
        expect(submitButton).toBeDisabled()
      })
      
      resolveSignIn!({ ok: true, error: null })
      
      await waitFor(() => {
        expect(emailInput).toBeEnabled()
        expect(passwordInput).toBeEnabled()
        expect(submitButton).toBeEnabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when signIn returns an error', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: 'CredentialsSignin' })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email or password/i)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('role', 'alert')
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('displays generic error message when signIn throws exception', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValue(new Error('Network error'))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/an error occurred. please try again./i)).toBeInTheDocument()
      })
    })

    it('clears error message on new form submission', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValueOnce({ error: 'CredentialsSignin' })
        .mockResolvedValueOnce({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // First submission with error
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
      
      // Second submission should clear error
      await user.clear(passwordInput)
      await user.type(passwordInput, 'correctpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
      })
    })

    it('handles empty error response gracefully', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: '' })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation and Accessibility', () => {
    it('supports keyboard navigation between form fields', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      expect(emailInput).toHaveFocus() // autoFocus is set
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('allows form submission with Enter key', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled()
      })
    })

    it('maintains focus management during error states', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: 'CredentialsSignin' })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
      
      // Focus should still be manageable after error
      await user.tab()
      expect(emailInput).toHaveFocus()
    })

    it('has proper ARIA attributes for screen readers', () => {
      render(<LoginPage />)
      
      const form = document.querySelector('form')
      expect(form).toHaveAttribute('noValidate')
      expect(form).toHaveAttribute('aria-busy', 'false')
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined signIn response', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue(undefined)
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Should not crash and should handle gracefully
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles null signIn response', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue(null)
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles rapid form submissions', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      mockSignIn.mockImplementation(() => new Promise(resolve => {
        resolveSignIn = resolve
      }))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Click submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only call signIn once
      expect(mockSignIn).toHaveBeenCalledTimes(1)
      
      resolveSignIn!({ ok: true, error: null })
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles very long input values', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      const longEmail = 'a'.repeat(100) + '@example.com'
      const longPassword = 'p'.repeat(200)
      
      await user.type(emailInput, longEmail)
      await user.type(passwordInput, longPassword)
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: longEmail,
          password: longPassword,
          redirect: false,
        })
      })
    })

    it('preserves form data when component re-renders', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Re-render the component
      rerender(<LoginPage />)
      
      // Form data should be preserved (though this depends on form state management)
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('password123')).toBeInTheDocument()
    })
  })

  describe('Component Lifecycle', () => {
    it('does not call signIn on mount', () => {
      render(<LoginPage />)
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('cleans up properly on unmount', () => {
      const { unmount } = render(<LoginPage />)
      unmount()
      // No specific cleanup expectations, but should not throw errors
    })
  })
})