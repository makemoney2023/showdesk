import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md text-sm text-sss-text-muted">
          Loading login…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
