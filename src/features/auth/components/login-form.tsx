"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { acceptInvitationAction } from "@/features/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  callbackUrl,
  inviteToken,
  prefillEmail,
}: {
  callbackUrl?: string;
  inviteToken?: string;
  prefillEmail?: string;
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
      toast.error("No se pudo iniciar sesión. Revisá email y contraseña.");
      return;
    }

    if (inviteToken) {
      const accepted = await acceptInvitationAction({ token: inviteToken });
      if (!accepted.ok) {
        toast.message("Sesión iniciada", {
          description: accepted.error,
        });
      } else {
        toast.success("Te uniste al workspace");
      }
    }

    setIsSubmitting(false);
    router.push(callbackUrl ?? "/dashboard");
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="text-xs font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="text-xs font-medium text-foreground"
        >
          Contraseña
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
