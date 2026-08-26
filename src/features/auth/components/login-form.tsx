"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import {
  AuthMethodDivider,
  GoogleSignInButton,
} from "@/features/auth/components/google-sign-in-button";
import { FormField } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigateAndRefresh } from "@/lib/navigation";

export function LoginForm({
  callbackUrl,
  prefillEmail,
  googleEnabled = false,
  googleClientId,
}: {
  callbackUrl?: string;
  prefillEmail?: string;
  googleEnabled?: boolean;
  googleClientId?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefillEmail ?? "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsSubmitting(true);
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: callbackUrl ?? "/dashboard",
    });

    if (error) {
      setIsSubmitting(false);
      toast.error("No se pudo iniciar sesión", {
        description: googleEnabled
          ? "Revisá email y contraseña. Si creaste la cuenta con Google, usá Continuar con Google (no hay contraseña aún)."
          : "Revisá email y contraseña.",
      });
      return;
    }

    setIsSubmitting(false);
    navigateAndRefresh(router, callbackUrl ?? "/dashboard");
  };

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <>
          <GoogleSignInButton
            mode="login"
            callbackUrl={callbackUrl}
            googleClientId={googleClientId}
          />
          <AuthMethodDivider />
        </>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}
