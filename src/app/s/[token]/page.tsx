import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getPublicSplitGroup, isUserMemberOfSplitGroup } from "@/features/splits/services";
import { InvalidPublicShareTokenError } from "@/features/splits/domain";
import { PublicSplitGroupView } from "@/features/splits/components/public-split-group-view";
import { JoinSplitGroupButton } from "@/features/splits/components/join-split-group-button";

export const metadata: Metadata = {
  title: "Gastos divididos",
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
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
          <h1 className="font-heading text-xl font-extrabold text-foreground">
            Este enlace no es válido
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pedile a quien te lo mandó que genere uno nuevo.
          </p>
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
    <>
      <PublicSplitGroupView group={group} />
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 pb-10">
        {session?.user?.id ? (
          alreadyMember ? (
            <p className="text-sm text-muted-foreground">
              Ya estás en este grupo.{" "}
              <Link
                href={`/groups/${group.id}`}
                className="underline underline-offset-2"
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
            <Link href={loginHref} className="underline underline-offset-2">
              Entrá para sumarte al grupo
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
