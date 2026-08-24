"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { acceptInvitationAction } from "@/features/workspaces/actions";
import {
  AuthMethodDivider,
  GoogleSignInButton,
} from "@/features/auth/components/google-sign-in-button";
import { FormField } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigateAndRefresh } from "@/lib/navigation";

export function RegisterForm({
  inviteToken,
  prefillEmail,
  googleEnabled = false,
  googleClientId,
}: {
  inviteToken?: string;
  prefillEmail?: string;
  googleEnabled?: boolean;
  googleClientId?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailLocked = Boolean(prefillEmail);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: prefillEmail ?? "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setIsSubmitting(true);
    const { error } = await signUp.email({
      email: values.email,
      password: values.password,
      name: values.displayName,
      callbackURL: "/onboarding",
    });

    if (error) {
      setIsSubmitting(false);
      toast.error(
        error.message ?? "No pudimos crear tu cuenta. Intentá de nuevo.",
        googleEnabled
          ? {
              description:
                "Si ese email ya lo usaste con Continuar con Google, iniciá sesión con Google en lugar de registrarte de nuevo.",
            }
          : undefined,
      );
      return;
    }

    // Personal workspace + pending invites are accepted in the auth hook.
    // Call accept with the token to set the active group workspace cookie.
    if (inviteToken) {
      const accepted = await acceptInvitationAction({ token: inviteToken });
      if (!accepted.ok) {
        toast.message("Cuenta creada", {
          description:
            "No pudimos activar el workspace invitado automáticamente. Abrí el link de nuevo.",
        });
      } else {
        toast.success("Cuenta creada y unido al workspace");
      }
    } else {
      toast.success("Cuenta creada");
    }

    setIsSubmitting(false);
    navigateAndRefresh(router, "/onboarding");
  };

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <>
          <GoogleSignInButton
            mode="register"
            inviteToken={inviteToken}
            googleClientId={googleClientId}
          />
          <AuthMethodDivider />
        </>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {inviteToken ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Al registrarte vas a tener tu espacio personal y también vas a
            unirte al workspace al que te invitaron.
          </p>
        ) : null}

        <FormField
          label="Nombre"
          htmlFor="displayName"
          error={errors.displayName?.message}
        >
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(errors.displayName)}
            {...register("displayName")}
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            readOnly={emailLocked}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="password"
          error={errors.password?.message}
          hint="Mínimo 8 caracteres."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
    </div>
  );
}
