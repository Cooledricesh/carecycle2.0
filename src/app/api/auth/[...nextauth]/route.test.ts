/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// Mock the handler function that will be created by NextAuth
const mockHandler = jest.fn()

// Mock NextAuth to return our mock handler
jest.mock('next-auth', () => {
  return jest.fn(() => mockHandler)
})

// Mock the auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {
    providers: [],
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      session: jest.fn(),
      jwt: jest.fn(),
    },
    session: {
      strategy: 'jwt',
    },
    secret: 'test-secret',
  }
}))

describe('/api/auth/[...nextauth] Route', () => {
  // Import after mocking
  let GET: any, POST: any

  beforeAll(async () => {
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockHandler.mockResolvedValue(new Response('Test response', { status: 200 }))
  })

  describe('Route Handler Exports', () => {
    it('exports GET handler', () => {
      expect(GET).toBeDefined()
      expect(typeof GET).toBe('function')
    })

    it('exports POST handler', () => {
      expect(POST).toBeDefined()
      expect(typeof POST).toBe('function')
    })

    it('GET and POST handlers are the same function', () => {
      expect(GET).toBe(POST)
      expect(GET).toBe(mockHandler)
    })
  })

  describe('Handler Functionality', () => {
    it('calls the NextAuth handler with GET request', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', { method: 'GET' })
      
      await GET(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })

    it('calls the NextAuth handler with POST request', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })
      
      await POST(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })

    it('returns response from NextAuth handler', async () => {
      const expectedResponse = new Response('Custom response', { status: 201 })
      mockHandler.mockResolvedValueOnce(expectedResponse)
      
      const request = new NextRequest('http://localhost:3000/api/auth/session')
      const response = await GET(request)
      
      expect(response).toBe(expectedResponse)
    })

    it('handles different NextAuth routes', async () => {
      const routes = [
        'http://localhost:3000/api/auth/signin',
        'http://localhost:3000/api/auth/signout', 
        'http://localhost:3000/api/auth/session',
        'http://localhost:3000/api/auth/providers',
        'http://localhost:3000/api/auth/csrf'
      ]

      for (const url of routes) {
        const request = new NextRequest(url)
        await GET(request)
        
        expect(mockHandler).toHaveBeenCalledWith(request)
      }
      
      expect(mockHandler).toHaveBeenCalledTimes(routes.length)
    })

    it('handles requests with various headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
          'Cookie': 'session=test'
        }
      })
      
      await GET(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(request.headers.get('Authorization')).toBe('Bearer test-token')
    })

    it('handles POST requests with form data', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: formData
      })
      
      await POST(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('handles requests with query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin?callbackUrl=/dashboard')
      
      await GET(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(request.url).toContain('callbackUrl=/dashboard')
    })
  })

  describe('Error Handling', () => {
    it('propagates errors from NextAuth handler', async () => {
      const testError = new Error('NextAuth error')
      mockHandler.mockRejectedValueOnce(testError)
      
      const request = new NextRequest('http://localhost:3000/api/auth/signin')
      
      await expect(GET(request)).rejects.toThrow('NextAuth error')
    })

    it('handles concurrent requests', async () => {
      const requests = Array(3).fill(0).map((_, i) => 
        new NextRequest(`http://localhost:3000/api/auth/session?req=${i}`)
      )
      
      const responses = await Promise.all(requests.map(req => GET(req)))
      
      expect(mockHandler).toHaveBeenCalledTimes(3)
      responses.forEach(response => {
        expect(response).toBeInstanceOf(Response)
      })
    })
  })

  describe('Request Handling Edge Cases', () => {
    it('handles requests with empty body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      await POST(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('handles requests with special characters in URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin?callback=%2Fdashboard%3Ftest%3D1')
      
      await GET(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('handles requests with Unicode in body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'пароль123', // Cyrillic characters
          name: '测试用户' // Chinese characters
        })
      })
      
      await POST(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
    })
  })

  describe('Integration Tests', () => {
    it('maintains consistent behavior between GET and POST', async () => {
      const url = 'http://localhost:3000/api/auth/signin'
      
      // GET request
      const getRequest = new NextRequest(url, { method: 'GET' })
      const getResponse = await GET(getRequest)
      
      // POST request  
      const postRequest = new NextRequest(url, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      })
      const postResponse = await POST(postRequest)
      
      expect(mockHandler).toHaveBeenCalledTimes(2)
      expect(getResponse).toBeInstanceOf(Response)
      expect(postResponse).toBeInstanceOf(Response)
    })

    it('properly forwards request context to NextAuth', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          'User-Agent': 'Test Agent',
          'X-Forwarded-For': '127.0.0.1',
          'Cookie': 'next-auth.session-token=test-token'
        }
      })
      
      await GET(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
      
      // Verify the request object passed has expected properties
      const callArgs = mockHandler.mock.calls[0][0]
      expect(callArgs.url).toBe('http://localhost:3000/api/auth/session')
      expect(callArgs.headers.get('User-Agent')).toBe('Test Agent')
      expect(callArgs.headers.get('Cookie')).toContain('next-auth.session-token=test-token')
    })
  })
})