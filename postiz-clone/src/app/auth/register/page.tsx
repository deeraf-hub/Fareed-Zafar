import { Suspense } from "react";
import { AuthForm } from "@/components/landing/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
