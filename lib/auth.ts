import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Simplified auth for v0 preview environment

type User = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

type Session = {
  user: User | null;
};

export async function auth(): Promise<Session> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth-session");

  if (sessionCookie?.value) {
    try {
      const user = JSON.parse(sessionCookie.value);
      return { user };
    } catch {
      return { user: null };
    }
  }

  return { user: null };
}

export async function loginAction(formData: FormData) {
  "use server";

  const email = formData.get("email") as string;

  if (email) {
    const cookieStore = await cookies();
    const user = {
      id: "user-1",
      name: email.split("@")[0],
      email: email,
    };
    cookieStore.set("auth-session", JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  }

  redirect("/admin");
}

export async function logoutAction() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete("auth-session");
  redirect("/");
}
