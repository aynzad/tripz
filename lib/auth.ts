'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export type User = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export type Session = {
  user: User | null
}

export async function auth(): Promise<Session> {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    return {
      user: {
        id: session.user.id || session.user.email || 'unknown',
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    }
  }

  return { user: null }
}
