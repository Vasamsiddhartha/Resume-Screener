import type { User, LoginCredentials, ForgotPasswordPayload, ResetPasswordPayload } from '@/types'
import { MOCK_USERS, MOCK_CREDENTIALS } from '@/mock/data'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

interface LoginResponse {
  user: User
  token: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    await delay(800)
    const user = MOCK_USERS.find(u => u.email === credentials.email)
    const validPassword = MOCK_CREDENTIALS[credentials.email] === credentials.password

    if (!user || !validPassword) {
      throw new Error('Invalid email or password')
    }
    if (!user.isActive) {
      throw new Error('Your account has been deactivated. Contact support.')
    }

    const token = `mock_jwt_${user.id}_${Date.now()}`
    return { user, token }
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await delay(600)
    const user = MOCK_USERS.find(u => u.email === payload.email)
    if (!user) {
      // Don't reveal whether email exists
      return
    }
    // In production: send reset email via API
  },

  async resetPassword(_payload: ResetPasswordPayload): Promise<void> {
    await delay(800)
    // In production: verify token and update password via API
  },

  async verifyEmail(_token: string): Promise<void> {
    await delay(600)
    // In production: verify email token via API
  },

  async refreshToken(_token: string): Promise<string> {
    await delay(300)
    return `mock_jwt_refreshed_${Date.now()}`
  },

  async logout(): Promise<void> {
    await delay(200)
    // In production: invalidate token on server
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    await delay(500)
    // In production: PATCH /me with the updated fields
    return updates as User
  },

  async changePassword(_current: string, _next: string): Promise<void> {
    await delay(600)
    // In production: verify current password and set new one
  },
}
