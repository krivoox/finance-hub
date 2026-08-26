import { redirect, notFound } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { getSession } from "@/lib/session";
import { getRequestOrigin } from "@/lib/request-origin";
import { getSplitGroup } from "@/features/splits/services";
import { SplitNotFoundError, NotSplitGroupUserMemberError } from "@/features/splits/domain";
import { SplitGroupDetail } from "@/features/splits/components/split-group-detail";
import {
  peopleCountLabel,
  splitGroupKindLabel,
} from "@/features/splits/components/split-copy";

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
      description={`${splitGroupKindLabel(group.kind)} · ${peopleCountLabel(group.members.length)}`}
    >
      <SplitGroupDetail group={group} shareUrl={shareUrl} />
    </ContentPanel>
  );
}
