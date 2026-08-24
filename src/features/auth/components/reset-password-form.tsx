"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import { FormField } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const { error } = await authClient.resetPassword({
      token: values.token,
      newPassword: values.newPassword,
    });
    if (error) {
      setServerError(
        "No pudimos restablecer tu contraseña. El enlace puede haber expirado.",
      );
      return;
    }
    toast.success("Contraseña actualizada. Iniciá sesión.");
    router.push("/login");
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...register("token")} />

      <FormField
        label="Nueva contraseña"
        htmlFor="newPassword"
        error={errors.newPassword?.message}
        hint="Mínimo 8 caracteres."
      >
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPassword)}
          {...register("newPassword")}
        />
      </FormField>

      {serverError ? (
        <p className="text-xs text-destructive">{serverError}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
