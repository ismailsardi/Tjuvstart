/** The parts of Google Identity Services (accounts.google.com/gsi/client) that Tjuvstart uses. */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
        use_fedcm_for_prompt?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: { theme?: string; size?: string; text?: string; shape?: string; locale?: string },
      ): void;
      disableAutoSelect(): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

let loading: Promise<GoogleIdentity> | undefined;

/** Loads Google's sign-in script once, the first time a sign-in button is shown. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    if (window.google) return resolve(window.google);
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('No google')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.append(script);
  });
  return loading;
}

/** Renders Google's own sign-in button into `parent` and reports the ID token it returns. */
export async function renderGoogleButton(
  parent: HTMLElement,
  clientId: string,
  locale: string,
  onIdToken: (idToken: string) => void,
): Promise<void> {
  const google = await loadGoogleIdentity();
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onIdToken(response.credential),
    use_fedcm_for_prompt: true,
  });
  google.accounts.id.renderButton(parent, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    locale,
  });
}
