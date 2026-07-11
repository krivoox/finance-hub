"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  const onSubmit = async (values: RegisterInput) => {
    setIsSubmitting(true);
    const { error } = await signUp.email({
      email: values.email,
      password: values.password,
      name: values.displayName,
      callbackURL: "/dashboard",
    });
    setIsSubmitting(false);

    if (error) {
      const message =
        error.message ?? "No pudimos crear tu cuenta. Intentá de nuevo.";
      toast.error(message);
      return;
    }
    toast.success("Cuenta creada");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1">
        <label
          htmlFor="displayName"
          className="text-xs font-medium text-foreground"
        >
          Nombre
        </label>
        <Input
          id="displayName"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(errors.displayName)}
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="text-xs text-destructive">
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

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
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">
            {errors.password.message}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Mínimo 8 caracteres.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
