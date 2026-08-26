import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getPublicSplitGroup, isUserMemberOfSplitGroup } from "@/features/splits/services";
import { InvalidPublicShareTokenError } from "@/features/splits/domain";
import { PublicSplitGroupView } from "@/features/splits/components/public-split-group-view";
import { JoinSplitGroupButton } from "@/features/splits/components/join-split-group-button";

export const metadata: Metadata = {
  title: "Saldos compartidos",
  robots: { index: false, follow: false },
};

export default async function PublicSplitGroupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let group;
  try {
    group = await getPublicSplitGroup(token);
  } catch (err) {
    if (err instanceof InvalidPublicShareTokenError) {
      return (
        <main className="flex min-h-dvh flex-col bg-background">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8">
            <p className="font-heading text-lg font-extrabold tracking-tight text-foreground">
              Finance Hub
            </p>
            <h1 className="mt-6 font-heading text-xl font-extrabold text-foreground">
              Este enlace no es válido
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pedile a quien te lo mandó que genere uno nuevo.
            </p>
          </div>
        </main>
      );
    }
    throw err;
  }

  const session = await getSession();
  const alreadyMember = session?.user?.id
    ? await isUserMemberOfSplitGroup(session.user.id, group.id)
    : false;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/s/${token}`)}`;

  return (
    <PublicSplitGroupView group={group}>
      {session?.user?.id ? (
        alreadyMember ? (
          <p className="text-sm text-muted-foreground">
            Ya estás en este grupo.{" "}
            <Link
              href={`/groups/${group.id}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Abrirlo
            </Link>
          </p>
        ) : (
          <JoinSplitGroupButton token={token} />
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          ¿Tenés cuenta?{" "}
          <Link
            href={loginHref}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Entrá para sumarte
          </Link>
        </p>
      )}
    </PublicSplitGroupView>
  );
}
