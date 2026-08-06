/**
 * Google Identity Services (GIS) credential → JWT id_token, without leaving
 * the page. Used in installed PWAs where OAuth redirect breaks cookie/state
 * (especially iOS standalone).
 *
 * Requires Authorized JavaScript origins in Google Cloud Console (same as
 * GIS / One Tap), not only redirect URIs.
 */

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type CredentialResponse = {
  credential?: string;
};

type PromptMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: "signin" | "signup" | "use";
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: (
    momentListener?: (notification: PromptMomentNotification) => void,
  ) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GIS requires a browser"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services")),
        { once: true },
      );
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Identity Services"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type RequestGoogleIdTokenOptions = {
  clientId: string;
  context?: "signin" | "signup";
  /** Max wait for a credential after prompt (ms). */
  timeoutMs?: number;
};

/**
 * Opens the GIS account chooser / FedCM prompt and resolves with the JWT
 * id_token. Rejects if the prompt is not shown, dismissed, or times out —
 * callers should fall back to OAuth redirect.
 */
export async function requestGoogleIdToken(
  options: RequestGoogleIdTokenOptions,
): Promise<string> {
  const { clientId, context = "signin", timeoutMs = 120_000 } = options;

  await loadGisScript();

  const accountsId = window.google?.accounts?.id;
  if (!accountsId) {
    throw new Error("Google Identity Services unavailable");
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        accountsId.cancel();
      } catch {
        // ignore
      }
      fn();
    };

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error("Google sign-in timed out")));
    }, timeoutMs);

    accountsId.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      context,
      use_fedcm_for_prompt: true,
      callback: (response) => {
        const token = response.credential;
        if (!token) {
          finish(() => reject(new Error("Google did not return an id token")));
          return;
        }
        finish(() => resolve(token));
      },
    });

    accountsId.prompt((notification) => {
      if (settled) return;

      // Success path: GIS dismisses with credential_returned, then invokes callback.
      if (notification.isDismissedMoment()) {
        const reason = notification.getDismissedReason?.();
        if (reason === "credential_returned") return;
        finish(() =>
          reject(new Error("Google Identity prompt was dismissed")),
        );
        return;
      }

      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        finish(() =>
          reject(new Error("Google Identity prompt was not completed")),
        );
      }
    });
  });
}
