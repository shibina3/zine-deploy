/**
 * Google Drive backup transport.
 *
 * Uses Google Identity Services (browser OAuth) with the `drive.appdata` scope,
 * which only exposes Zine's own hidden application folder. Access tokens live in
 * memory only and are never written to storage or logs.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export interface DriveSession {
  accessToken: string;
  expiresAt: number;
  scope: string;
}

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              scope?: string;
              error?: string;
            }) => void;
            error_callback?: (error: unknown) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Drive needs a browser.'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection.'));
    document.head.appendChild(script);
  });

  return gisPromise;
}

/** Opens the Google consent popup and resolves with an in-memory token. */
export async function requestDriveAccess(clientId: string): Promise<DriveSession> {
  if (!clientId) {
    throw new Error('Add your Google OAuth client ID in Settings before connecting Drive.');
  }
  await loadGoogleIdentityServices();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Google sign-in is unavailable in this browser.');

  return new Promise<DriveSession>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error === 'access_denied'
                ? 'Google Drive access was declined.'
                : 'Google sign-in failed.',
            ),
          );
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 - 30_000,
          scope: response.scope ?? DRIVE_SCOPE,
        });
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled.')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function tokenValid(session: DriveSession | null): boolean {
  return Boolean(session && session.accessToken && session.expiresAt > Date.now());
}

async function driveError(response: Response): Promise<Error> {
  let message = `Google Drive request failed (${response.status}).`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    /* keep default */
  }
  return new Error(message);
}

/** Uploads an encrypted backup into the hidden app-data folder. */
export async function uploadBackup(
  session: DriveSession,
  fileName: string,
  blob: Blob,
): Promise<DriveFile> {
  if (!tokenValid(session)) {
    throw new Error('Your Google Drive session expired. Reconnect and try again.');
  }

  const boundary = `zine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata = {
    name: fileName,
    parents: ['appDataFolder'],
    mimeType: 'application/octet-stream',
  };

  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body,
    },
  );

  if (!response.ok) throw await driveError(response);
  return (await response.json()) as DriveFile;
}

/** Lists recent Zine backups from the app-data folder. */
export async function listBackups(session: DriveSession): Promise<DriveFile[]> {
  if (!tokenValid(session)) {
    throw new Error('Your Google Drive session expired. Reconnect and try again.');
  }

  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,size,modifiedTime)',
    orderBy: 'createdTime desc',
    pageSize: '25',
    q: "name contains 'zine-backup' and trashed = false",
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!response.ok) throw await driveError(response);
  const payload = (await response.json()) as { files?: DriveFile[] };
  return payload.files ?? [];
}

export async function downloadBackup(session: DriveSession, fileId: string): Promise<Blob> {
  if (!tokenValid(session)) {
    throw new Error('Your Google Drive session expired. Reconnect and try again.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  );
  if (!response.ok) throw await driveError(response);
  return response.blob();
}
