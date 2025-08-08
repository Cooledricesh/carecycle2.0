import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientRegistrationForm } from './patient-registration-form'
import { useToast } from '@/hooks/use-toast'

// Mock toast hook
jest.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = jest.fn()

describe('PatientRegistrationForm', () => {
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders all form fields correctly', async () => {
    // Mock fetch for items
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })
    
    const { container } = render(<PatientRegistrationForm />)
    
    // Wait for component to load
    await waitFor(() => {
      // Check for required fields based on actual form structure
      expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/환자 이름/i)).toBeInTheDocument()
      
      // Check for section header
      expect(screen.getByText(/관리 항목 선택/i)).toBeInTheDocument()
      
      // Check for the submit button
      expect(screen.getByRole('button', { name: /환자 등록/i })).toBeInTheDocument()
    })
  })

  it('displays validation errors for empty required fields', async () => {
    // Mock fetch for items
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', name: '혈액검사', type: 'test', period_value: 30, period_unit: 'days' }
      ]
    })
    
    const { container } = render(<PatientRegistrationForm />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /환자 등록/i })).toBeInTheDocument()
    })
    
    // Submit the form directly to avoid button ripple side-effects in tests
    const formEl = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(formEl)
    
    await waitFor(() => {
      // Check for validation error messages
      expect(screen.getByText(/환자 번호를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    // Mock initial items fetch
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: '혈액검사', type: 'test', period_value: 30, period_unit: 'days' }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', message: 'Patient registered successfully' }),
      })

    const { container } = render(<PatientRegistrationForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
    })
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/환자 번호/i), {
      target: { value: 'P12345' },
    })
    fireEvent.change(screen.getByLabelText(/환자 이름/i), {
      target: { value: '홍길동' },
    })
    
    // Select an item (checkbox)
    const checkbox = await screen.findByRole('checkbox')
    fireEvent.click(checkbox)
    
    // Wait for date field to appear and fill it
    await waitFor(() => {
      const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement | null
      expect(dateInput).not.toBeNull()
      if (dateInput) {
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      }
    })
    
    // Submit the form directly to avoid button ripple side-effects in tests
    const formEl = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(formEl)
    
    await waitFor(() => {
      // Check if API was called - the second call should be the submission
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenLastCalledWith(
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
          description: '환자가 성공적으로 등록되었습니다',
        })
      )
    })
  })

  it('handles API errors gracefully', async () => {
    // Mock initial items fetch then API error
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: '혈액검사', type: 'test', period_value: 30, period_unit: 'days' }
        ],
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const { container } = render(<PatientRegistrationForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
    })
    
    // Fill in minimum required fields
    fireEvent.change(screen.getByLabelText(/환자 번호/i), {
      target: { value: 'P12345' },
    })
    fireEvent.change(screen.getByLabelText(/환자 이름/i), {
      target: { value: '홍길동' },
    })
    
    // Select an item
    const checkbox = await screen.findByRole('checkbox')
    fireEvent.click(checkbox)
    
    // Wait for date field to appear and fill it
    await waitFor(() => {
      const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement | null
      expect(dateInput).not.toBeNull()
      if (dateInput) {
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      }
    })
    
    // Submit the form directly to avoid button ripple side-effects in tests
    const formEl = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(formEl)
    
    await waitFor(() => {
      // Check if error toast was shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '오류',
          description: 'Network error',
          variant: 'destructive',
        })
      )
    })
  })

  it('verifies form rendering and basic interaction', async () => {
    // Mock initial items fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', name: '혈액검사', type: 'test', period_value: 30, period_unit: 'days' }
      ],
    })

    render(<PatientRegistrationForm />)
    
    await waitFor(() => {
      expect(screen.getByText(/관리 항목 선택/i)).toBeInTheDocument()
    })
    
    // Verify the form is rendered
    expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/환자 이름/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /환자 등록/i })).toBeInTheDocument()
    
    // Verify item checkbox is present
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
  })
})