import { auth, loginAction } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

export default async function LoginPage() {
  const session = await auth()

  if (session?.user) {
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold">TripViz</span>
          </div>

          <h1 className="text-2xl font-semibold text-center mb-2">Admin Access</h1>
          <p className="text-muted-foreground text-center mb-8">Sign in to manage your trips</p>

          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="admin@example.com" required className="h-12" />
            </div>
            <Button type="submit" className="w-full h-12 text-base">
              Sign In
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Demo mode: Enter any email to access the admin panel.
          </p>
        </div>
      </div>
    </div>
  )
}
