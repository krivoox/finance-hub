"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { subscribeMarketingAction } from "@/features/email/actions/subscribe-marketing";
import {
  subscribeMarketingSchema,
  type SubscribeMarketingInput,
} from "@/features/email/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSubscribeForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeMarketingInput>({
    resolver: zodResolver(subscribeMarketingSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await subscribeMarketingAction(values);
    if (!result.ok) {
      setError("root", { message: result.error });
      return;
    }
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        Listo. Si el email es válido, te sumamos a las novedades. Podés darte de
        baja en cualquier momento desde el enlace de cada correo.
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit} noValidate method="post">
      <div className="space-y-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email para novedades
        </label>
        <Input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>
      {errors.root ? (
        <p className="text-xs text-destructive">{errors.root.message}</p>
      ) : null}
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Enviando..." : "Quiero novedades"}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Te escribimos avances del producto. Sin spam. El envío es el
        consentimiento; cada mail incluye darse de baja.
      </p>
    </form>
  );
}
