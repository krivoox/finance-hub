"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/features/auth/schemas";
import { FormField } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    // SPEC-01 §5: always show a generic success (no email enumeration).
    // Fire-and-forget so a slow/failing mailer or DB does not trap the UI.
    void authClient
      .requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      .catch(() => {
        // Swallow: the public surface stays generic.
      });
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Si el email está registrado con contraseña, recibirás un enlace para
          restablecerla.
        </p>
        <p>
          Si solo usás Google, no hay contraseña asociada: volvé al login y
          elegí Continuar con Google.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate method="post">
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar enlace"}
      </Button>
    </form>
  );
}
