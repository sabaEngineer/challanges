import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/feed");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Challanges</h1>
          <p className="text-slate-400">
            Sign in to continue your journey
          </p>
        </div>

        <LoginForm />

        <p className="text-center mt-6 text-slate-500 text-sm">
          By signing in, you agree to our terms and conditions
        </p>
      </div>
    </div>
  );
}
