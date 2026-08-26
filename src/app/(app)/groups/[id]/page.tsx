import { redirect, notFound } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { getRequestOrigin } from "@/lib/request-origin";
import { getSplitGroup } from "@/features/splits/services";
import { SplitNotFoundError, NotSplitGroupUserMemberError } from "@/features/splits/domain";
import { SplitGroupDetail } from "@/features/splits/components/split-group-detail";
import { SplitGroupDetailActions } from "@/features/splits/components/split-group-detail-actions";
import { peopleCountLabel } from "@/features/splits/components/split-copy";

export default async function SplitGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  let group;
  try {
    group = await getSplitGroup({
      userId: session.user.id,
      splitGroupId: id,
    });
  } catch (err) {
    if (
      err instanceof SplitNotFoundError ||
      err instanceof NotSplitGroupUserMemberError
    ) {
      notFound();
    }
    throw err;
  }

  const origin = await getRequestOrigin();
  const shareUrl = `${origin}/s/${group.publicShareToken}`;

  return (
    <ContentPanel
      title={group.name}
      description={peopleCountLabel(group.members.length)}
      actions={
        group.isCreator ? (
          <div className="flex w-full justify-end sm:w-auto">
            <SplitGroupDetailActions
              splitGroupId={group.id}
              name={group.name}
            />
          </div>
        ) : undefined
      }
    >
      <SplitGroupDetail group={group} shareUrl={shareUrl} />
    </ContentPanel>
  );
}
