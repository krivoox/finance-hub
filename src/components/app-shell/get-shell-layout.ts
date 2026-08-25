import "server-only";

import { cookies } from "next/headers";

import {
  SHELL_LAYOUT_COOKIE,
  resolveShellLayout,
  type ShellLayout,
} from "./shell-layout";

/** RSC: compact unless the shell already wrote `fh-shell=full` (`md+`). */
export async function getShellLayout(): Promise<ShellLayout> {
  const store = await cookies();
  return resolveShellLayout(store.get(SHELL_LAYOUT_COOKIE)?.value);
}
