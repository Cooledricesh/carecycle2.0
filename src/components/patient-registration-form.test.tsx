import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientRegistrationForm } from './patient-registration-form'
import { useToast } from '@/hooks/use-toast'

// Mock toast hook
jest.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = jest.fn()

describe('PatientRegistrationForm', () => {
  const mockPush = jest.fn()
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock useRouter from next/navigation
    const navigationModule = jest.requireMock('next/navigation')
    navigationModule.useRouter = jest.fn(() => ({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
    }))
    ;(useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders all form fields correctly', () => {
    render(<PatientRegistrationForm />)
    
    // Check for required fields
    expect(screen.getByLabelText(/환자 이름/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/생년월일/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/의료 기록 번호/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/진단명/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/담당 의사/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/치료 시작일/i)).toBeInTheDocument()
    
    // Check for the submit button
    expect(screen.getByRole('button', { name: /환자 등록/i })).toBeInTheDocument()
  })

  it('displays validation errors for empty required fields', async () => {
    render(<PatientRegistrationForm />)
    
    const submitButton = screen.getByRole('button', { name: /환자 등록/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Check for validation error messages
      const errors = screen.getAllByRole('alert')
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  it('submits form with valid data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', message: 'Patient registered successfully' }),
    })

    render(<PatientRegistrationForm />)
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/환자 이름/i), {
      target: { value: '홍길동' },
    })
    fireEvent.change(screen.getByLabelText(/생년월일/i), {
      target: { value: '1990-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/의료 기록 번호/i), {
      target: { value: 'MRN12345' },
    })
    fireEvent.change(screen.getByLabelText(/진단명/i), {
      target: { value: '당뇨병' },
    })
    fireEvent.change(screen.getByLabelText(/담당 의사/i), {
      target: { value: '김의사' },
    })
    fireEvent.change(screen.getByLabelText(/치료 시작일/i), {
      target: { value: '2024-01-01' },
    })
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /환자 등록/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Check if API was called
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('홍길동'),
        })
      )
      
      // Check if success toast was shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '성공',
          description: expect.stringContaining('환자가 성공적으로 등록되었습니다'),
        })
      )
      
      // Check if redirected
      expect(mockPush).toHaveBeenCalledWith('/patients')
    })
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<PatientRegistrationForm />)
    
    // Fill in minimum required fields
    fireEvent.change(screen.getByLabelText(/환자 이름/i), {
      target: { value: '홍길동' },
    })
    fireEvent.change(screen.getByLabelText(/생년월일/i), {
      target: { value: '1990-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/의료 기록 번호/i), {
      target: { value: 'MRN12345' },
    })
    fireEvent.change(screen.getByLabelText(/진단명/i), {
      target: { value: '당뇨병' },
    })
    fireEvent.change(screen.getByLabelText(/담당 의사/i), {
      target: { value: '김의사' },
    })
    fireEvent.change(screen.getByLabelText(/치료 시작일/i), {
      target: { value: '2024-01-01' },
    })
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /환자 등록/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Check if error toast was shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '오류',
          description: expect.stringContaining('환자 등록 중 오류가 발생했습니다'),
          variant: 'destructive',
        })
      )
      
      // Should not redirect on error
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('disables submit button while submitting', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    ;(global.fetch as jest.Mock).mockReturnValue(promise)

    render(<PatientRegistrationForm />)
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/환자 이름/i), {
      target: { value: '홍길동' },
    })
    fireEvent.change(screen.getByLabelText(/생년월일/i), {
      target: { value: '1990-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/의료 기록 번호/i), {
      target: { value: 'MRN12345' },
    })
    fireEvent.change(screen.getByLabelText(/진단명/i), {
      target: { value: '당뇨병' },
    })
    fireEvent.change(screen.getByLabelText(/담당 의사/i), {
      target: { value: '김의사' },
    })
    fireEvent.change(screen.getByLabelText(/치료 시작일/i), {
      target: { value: '2024-01-01' },
    })
    
    const submitButton = screen.getByRole('button', { name: /환자 등록/i })
    fireEvent.click(submitButton)
    
    // Button should be disabled while submitting
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ id: '123' }),
    })
    
    // Button should be enabled again after submission
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })
})