import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { T } from "@/components/T";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--bg-main)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            <T k="login.title" />
          </h1>
          <p className="text-sm text-faint mt-2"><T k="login.subtitle" /></p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
