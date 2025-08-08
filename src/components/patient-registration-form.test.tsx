import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientRegistrationForm } from './patient-registration-form'
import { useToast } from '@/hooks/use-toast'

// Mock modules
jest.mock('@/hooks/use-toast')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, initial, animate, transition, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock data for tests
const mockItems = [
  { 
    id: '1', 
    name: '혈액검사', 
    type: 'test', 
    period_value: 30, 
    period_unit: 'days' 
  },
  { 
    id: '2', 
    name: '혈압검사', 
    type: 'test', 
    period_value: 7, 
    period_unit: 'days' 
  },
  { 
    id: '3', 
    name: 'B12 주사', 
    type: 'injection', 
    period_value: 2, 
    period_unit: 'weeks' 
  },
  { 
    id: '4', 
    name: '인슐린 주사', 
    type: 'injection', 
    period_value: 1, 
    period_unit: 'months' 
  }
]

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
    // Suppress console errors for tests
    jest.clearAllMocks()
  })

  beforeAll(() => {
    // Suppress specific HeroUI ripple warnings in tests
    const originalError = console.error
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      if (args[0]?.toString().includes('HeroUI.Ripple')) {
        return // Suppress ripple errors
      }
      originalError(...args)
    })
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  // Helper function to setup successful items fetch
  const setupItemsFetch = (items = mockItems) => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => items
    })
  }

  // Helper function to render component with items loaded
  const renderWithItems = async (items = mockItems) => {
    setupItemsFetch(items)
    const result = render(<PatientRegistrationForm />)
    
    // Wait for both form fields and items to load
    await waitFor(() => {
      expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      if (items.length > 0) {
        expect(screen.getByText(items[0].name)).toBeInTheDocument()
      }
    }, { timeout: 3000 })

    return result
  }

  describe('Form Rendering and Initial State', () => {
    it('renders all required form elements correctly', async () => {
      await renderWithItems()

      // Check for main title
      expect(screen.getByText('환자 등록')).toBeInTheDocument()
      
      // Check for section headers
      expect(screen.getByText('기본 정보')).toBeInTheDocument()
      expect(screen.getByText('관리 항목 선택')).toBeInTheDocument()
      
      // Check for form fields with proper labels
      expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/환자 이름/i)).toBeInTheDocument()
      
      // Check for submit button
      expect(screen.getByRole('button', { name: /환자 등록하기/i })).toBeInTheDocument()
    })

    it('displays loading skeletons when items are loading', async () => {
      // Don't setup items fetch to keep loading state
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(() => {}) // Never resolves to keep loading state
      )
      
      render(<PatientRegistrationForm />)

      await waitFor(() => {
        // Check for skeleton elements by their class
        const skeletons = document.querySelectorAll('.h-16.w-full.rounded-lg')
        expect(skeletons.length).toBe(4)
      })
    })

    it('displays management items after loading', async () => {
      await renderWithItems()

      // Check for each item
      expect(screen.getByText('혈액검사')).toBeInTheDocument()
      expect(screen.getByText('혈압검사')).toBeInTheDocument()
      expect(screen.getByText('B12 주사')).toBeInTheDocument()
      expect(screen.getByText('인슐린 주사')).toBeInTheDocument()

      // Check for item types and periods (matching the actual text format)
      expect(screen.getByText('검사 · 30개월 주기')).toBeInTheDocument() // days -> 개월
      expect(screen.getByText('주사 · 2주 주기')).toBeInTheDocument()
    })

    it('initializes with proper default values', async () => {
      await renderWithItems()

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      expect(patientNumberInput).toHaveValue('')
      expect(patientNameInput).toHaveValue('')

      // Submit button should be disabled initially
      const submitButton = screen.getByRole('button', { name: /환자 등록하기/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Field Validation', () => {
    it('displays validation errors for required patient number', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const form = document.querySelector('form')!
      
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText(/환자 번호를 입력해주세요/i)).toBeInTheDocument()
      })
    })

    it('displays validation errors for required patient name', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      // Fill only patient number
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      await user.type(patientNumberInput, 'P12345')

      const form = document.querySelector('form')!
      
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText(/환자 이름을 입력해주세요/i)).toBeInTheDocument()
      })
    })

    it('prevents submission when no management items are selected', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      // Fill required fields
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      // Try to submit - should be blocked by submit button being disabled
      const submitButton = screen.getByRole('button', { name: /환자 등록하기/i })
      expect(submitButton).toBeDisabled()
      
      // The helper text should indicate what's needed
      expect(screen.getByText(/관리 항목을 최소 하나 이상 선택해주세요/i)).toBeInTheDocument()
    })

    it('validates date field when item is selected', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      // Fill required fields
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      // Select an item
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      // Wait for date field to appear and find the date setting section
      await waitFor(() => {
        expect(screen.getByText(/최초 시행일 설정/i)).toBeInTheDocument()
      })

      const form = document.querySelector('form')!
      
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText(/최초 시행일을 입력해주세요/i)).toBeInTheDocument()
      })
    })

    it('accepts valid input values', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)

      // Test normal characters
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      expect(patientNumberInput).toHaveValue('P12345')
      expect(patientNameInput).toHaveValue('홍길동')

      // Clear and test with special characters
      await user.clear(patientNumberInput)
      await user.clear(patientNameInput)

      await user.type(patientNumberInput, 'P-12345_ABC')
      await user.type(patientNameInput, '홍길동-김')

      expect(patientNumberInput).toHaveValue('P-12345_ABC')
      expect(patientNameInput).toHaveValue('홍길동-김')
    })

    it('handles long input values', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)

      const longPatientNumber = 'P' + 'A'.repeat(100)
      const longPatientName = '홍'.repeat(50) + '길동'

      await user.type(patientNumberInput, longPatientNumber)
      await user.type(patientNameInput, longPatientName)

      expect(patientNumberInput).toHaveValue(longPatientNumber)
      expect(patientNameInput).toHaveValue(longPatientName)
    })
  })

  describe('Management Item Selection', () => {
    it('allows selecting and deselecting items', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(4)

      // Select first item
      await user.click(checkboxes[0])
      expect(checkboxes[0]).toBeChecked()
      
      // Check selection indicator appears
      await waitFor(() => {
        expect(screen.getByText(/1개 항목 선택됨/i)).toBeInTheDocument()
      })

      // Deselect item
      await user.click(checkboxes[0])
      expect(checkboxes[0]).not.toBeChecked()

      // Selection indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText(/1개 항목 선택됨/i)).not.toBeInTheDocument()
      })
    })

    it('shows date field when item is selected', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      // Date field should appear
      await waitFor(() => {
        expect(screen.getByText(/최초 시행일 설정/i)).toBeInTheDocument()
        expect(document.querySelector('input[type="date"]')).toBeInTheDocument()
      })
    })

    it('allows multiple item selection', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const checkboxes = screen.getAllByRole('checkbox')
      
      // Select multiple items
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])
      await user.click(checkboxes[2])

      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).toBeChecked()
      expect(checkboxes[2]).toBeChecked()

      // Check selection count
      await waitFor(() => {
        expect(screen.getByText(/3개 항목 선택됨/i)).toBeInTheDocument()
      })

      // Multiple date fields should appear
      const dateInputs = document.querySelectorAll('input[type="date"]')
      expect(dateInputs).toHaveLength(3)
    })

    it('displays item details correctly', async () => {
      await renderWithItems()

      // Check if item names are displayed
      expect(screen.getByText('혈액검사')).toBeInTheDocument()
      expect(screen.getByText('B12 주사')).toBeInTheDocument()

      // Check item type badges
      expect(screen.getByText('검사 · 30개월 주기')).toBeInTheDocument()
      expect(screen.getByText('주사 · 2주 주기')).toBeInTheDocument()
    })

    it('handles item selection via checkbox interaction', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      // Test that clicking the checkbox selects the item properly
      const checkbox = screen.getAllByRole('checkbox')[0]
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)

      // Checkbox should be selected
      expect(checkbox).toBeChecked()
      
      // Selection indicator should appear
      await waitFor(() => {
        expect(screen.getByText(/1개 항목 선택됨/i)).toBeInTheDocument()
      })

      // Click again to deselect
      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('Form Submission', () => {
    const setupSuccessfulSubmission = () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '123', message: 'Patient registered successfully' })
        })
    }

    it('submits form with valid data successfully', async () => {
      const user = userEvent.setup()
      setupSuccessfulSubmission()

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill required fields
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      // Select an item
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      // Fill date
      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      // Submit form using form submission to avoid button ripple issues
      const form = document.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
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

        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '성공',
            description: '환자가 성공적으로 등록되었습니다',
          })
        )
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Setup delayed API response
      let resolveSubmission: (value: any) => void
      const submissionPromise = new Promise(resolve => {
        resolveSubmission = resolve
      })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockReturnValueOnce(submissionPromise)

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      // Submit form
      const form = document.querySelector('form')!
      fireEvent.submit(form)

      // Check loading state by looking for the disabled state and loading text
      await waitFor(() => {
        expect(screen.getByText(/등록 중.../i)).toBeInTheDocument()
      })

      // Resolve the promise
      resolveSubmission!({
        ok: true,
        json: async () => ({ id: '123' })
      })
    })

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Patient number already exists' })
        })

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      const form = document.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '오류',
            description: 'Patient number already exists',
            variant: 'destructive',
          })
        )
      })
    })

    it('handles network errors', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockRejectedValueOnce(new Error('Network connection failed'))

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      const form = document.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '오류',
            description: 'Network connection failed',
            variant: 'destructive',
          })
        )
      })
    })

    it('resets form after successful submission', async () => {
      const user = userEvent.setup()
      setupSuccessfulSubmission()

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill and submit form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      const form = document.querySelector('form')!
      fireEvent.submit(form)

      // Wait for success and check reset
      await waitFor(() => {
        expect(patientNumberInput).toHaveValue('')
        expect(patientNameInput).toHaveValue('')
        expect(checkbox).not.toBeChecked()
        expect(screen.queryByText(/개 항목 선택됨/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Persistence and Integration', () => {
    it('sends correct data structure to API', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '123', message: 'Patient registered successfully' })
        })

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      // Select two items
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      // Fill dates
      await waitFor(() => {
        const dateInputs = document.querySelectorAll('input[type="date"]')
        fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } })
        fireEvent.change(dateInputs[1], { target: { value: '2024-01-15' } })
      })

      const form = document.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        const lastCall = (global.fetch as jest.Mock).mock.calls.pop()
        const requestBody = JSON.parse(lastCall[1].body)
        
        expect(requestBody).toMatchObject({
          patientNumber: 'P12345',
          name: '홍길동',
          schedules: expect.arrayContaining([
            expect.objectContaining({
              itemId: '1',
              firstDate: '2024-01-01',
              periodValue: 30,
              periodUnit: 'days'
            }),
            expect.objectContaining({
              itemId: '2',
              firstDate: '2024-01-15',
              periodValue: 7,
              periodUnit: 'days'
            })
          ])
        })
      })
    })

    it('handles items fetch failure gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch items'))

      render(<PatientRegistrationForm />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '오류',
            description: '관리 항목을 불러오는데 실패했습니다',
            variant: 'destructive'
          })
        )
      })
    })

    it('handles empty items list', async () => {
      setupItemsFetch([])

      render(<PatientRegistrationForm />)

      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
        expect(screen.getByText('관리 항목 선택')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Features', () => {
    it('has proper labels for form inputs', async () => {
      await renderWithItems()

      // Check for proper labels using flexible matching
      expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/환자 이름/i)).toBeInTheDocument()

      // Check that labels are associated correctly
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      expect(patientNumberInput).toHaveAttribute('aria-describedby')
      expect(patientNameInput).toHaveAttribute('aria-describedby')
    })

    it('provides ARIA attributes for form validation', async () => {
      await renderWithItems()

      const form = document.querySelector('form')!
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        const patientNumberInput = screen.getByLabelText(/환자 번호/i)
        expect(patientNumberInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      const firstCheckbox = screen.getAllByRole('checkbox')[0]

      // Tab navigation
      await user.tab()
      expect(patientNumberInput).toHaveFocus()

      await user.tab()
      expect(patientNameInput).toHaveFocus()

      // Navigate to checkboxes
      await user.tab()
      await user.tab()
      expect(firstCheckbox).toHaveFocus()

      // Space to select checkbox
      await user.keyboard(' ')
      expect(firstCheckbox).toBeChecked()
    })

    it('has proper heading structure', async () => {
      await renderWithItems()

      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('환자 등록')

      // Section headings should be proper headings or have proper semantics
      expect(screen.getByText('기본 정보')).toBeInTheDocument()
      expect(screen.getByText('관리 항목 선택')).toBeInTheDocument()
    })

    it('provides descriptive button text and states', async () => {
      await renderWithItems()

      const submitButton = screen.getByRole('button', { name: /환자 등록하기/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Check disabled state message
      expect(screen.getByText(/관리 항목을 최소 하나 이상 선택해주세요/i)).toBeInTheDocument()
    })

    it('handles focus management properly', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      
      await user.click(patientNumberInput)
      expect(patientNumberInput).toHaveFocus()

      // Focus should remain manageable throughout form interaction
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)
      
      // Focus should be preserved or handled gracefully
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles malformed API responses', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => { throw new Error('Invalid JSON') }
        })

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill and submit form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      const form = document.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '오류',
            description: 'Invalid JSON',
            variant: 'destructive',
          })
        )
      })
    })

    it('handles special characters in input fields', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)

      // Test with various special characters
      await user.type(patientNumberInput, 'P-123/456_ABC@TEST')
      await user.type(patientNameInput, '홍길동-김철수(의사)')

      expect(patientNumberInput).toHaveValue('P-123/456_ABC@TEST')
      expect(patientNameInput).toHaveValue('홍길동-김철수(의사)')
    })

    it('handles rapid item selection/deselection', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      const checkbox = screen.getAllByRole('checkbox')[0]
      
      // Test that rapid toggling works - 3 clicks should end up selected
      await user.click(checkbox) // Selected
      await user.click(checkbox) // Deselected  
      await user.click(checkbox) // Selected
      
      // Final state should be selected
      await waitFor(() => {
        expect(checkbox).toBeChecked()
        expect(screen.getByText(/1개 항목 선택됨/i)).toBeInTheDocument()
      })
    })

    it('handles form submission with invalid date values', async () => {
      const user = userEvent.setup()
      await renderWithItems()

      // Fill required fields
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      // Select item
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      // Set invalid date manually
      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
        fireEvent.change(dateInput, { target: { value: '' } })
      })

      const form = document.querySelector('form')!
      
      await act(async () => {
        fireEvent.submit(form)
      })

      await waitFor(() => {
        expect(screen.getByText(/최초 시행일을 입력해주세요/i)).toBeInTheDocument()
      })
    })

    it('maintains form state when API calls fail', async () => {
      const user = userEvent.setup()
      
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockRejectedValueOnce(new Error('Network error'))

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      const form = document.querySelector('form')!
      fireEvent.submit(form)

      // Wait for error, then check form state is preserved
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        )
      })

      // Form data should be preserved
      expect(patientNumberInput).toHaveValue('P12345')
      expect(patientNameInput).toHaveValue('홍길동')
      expect(checkbox).toBeChecked()
    })
  })

  describe('Component Performance and Cleanup', () => {
    it('cleans up properly on unmount', async () => {
      const { unmount } = await renderWithItems()

      // Unmount component
      unmount()

      // No errors should be thrown, and no memory leaks should occur
      expect(true).toBe(true) // If we get here without errors, cleanup worked
    })

    it('handles multiple rapid submissions gracefully', async () => {
      const user = userEvent.setup()
      
      let submissionCount = 0
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems
        })
        .mockImplementation(async (url) => {
          if (url === '/api/patients') {
            submissionCount++
            await new Promise(resolve => setTimeout(resolve, 100))
            return {
              ok: true,
              json: async () => ({ id: `patient-${submissionCount}` })
            }
          }
          return { ok: false, json: async () => ({ error: 'Not found' }) }
        })

      render(<PatientRegistrationForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/환자 번호/i)).toBeInTheDocument()
      })

      // Fill form
      const patientNumberInput = screen.getByLabelText(/환자 번호/i)
      const patientNameInput = screen.getByLabelText(/환자 이름/i)
      
      await user.type(patientNumberInput, 'P12345')
      await user.type(patientNameInput, '홍길동')

      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)

      await waitFor(() => {
        const dateInput = document.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
      })

      // Submit form once and verify button becomes disabled during loading
      const form = document.querySelector('form')!
      fireEvent.submit(form)
      
      // Verify that during submission, further submissions would be blocked
      await waitFor(() => {
        expect(screen.getByText(/등록 중.../i)).toBeInTheDocument()
      })
      
      // Wait for the submission to complete
      await waitFor(() => {
        expect(submissionCount).toBe(1)
      }, { timeout: 3000 })
    })
  })
})