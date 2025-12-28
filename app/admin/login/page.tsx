import { auth, loginAction } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { Logo } from '@/components/logo'

export default async function LoginPage() {
  const session = await auth()

  if (session?.user) {
    redirect('/admin')
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border-border rounded-2xl border p-8 shadow-xl">
          <div className="mb-1 flex flex-col items-center justify-center gap-2">
            <Logo className="fill-primary size-24" />
          </div>

          <h1 className="mb-2 text-center text-2xl font-semibold">Admin Access</h1>
          <p className="text-muted-foreground mb-8 text-center">Sign in to manage your trips</p>

          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="admin@example.com" required className="h-12" />
            </div>
            <Button type="submit" className="h-12 w-full text-base">
              Sign In
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Demo mode: Enter any email to access the admin panel.
          </p>
        </div>
      </div>
    </div>
  )
}
