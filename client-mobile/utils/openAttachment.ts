import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import api from './api';

// Shared attachment opener for every screen that shows announcement /
// document files -- mobile counterpart of web's useFilePreview.js +
// FilePreviewModal.jsx. Same rule as web: never hand a file to a third-party
// online viewer (Google Docs Viewer, Office Online) -- files stay on the
// device or university infrastructure, per the Privacy Policy.
//
//   images           -> previewed in-app (the caller renders ImagePreviewOverlay)
//   PDF/DOCX Android -> opened directly in the phone's own viewer app
//   everything else  -> OS Share sheet (also the fallback if no viewer app exists)

export type AttachmentFile = {
  id: string;
  filename: string;
  mimeType?: string | null;
};

export type DownloadedFile = { uri: string; filename: string; mimeType: string };

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
};

// Server-sent MIME first; the extension is a fallback when it's missing or
// generic, so a "report.pdf" stored as application/octet-stream still opens.
export function resolveMimeType(file: AttachmentFile): string {
  const sent = (file.mimeType ?? '').toLowerCase();
  if (sent && sent !== 'application/octet-stream') return sent;
  const ext = file.filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME[ext] ?? (sent || 'application/octet-stream');
}

export const isImageMime = (mime: string) => mime.startsWith('image/');

const ANDROID_VIEWER_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// Authenticated download to the app cache (Bearer header, never a token in
// the URL). downloadAsync only rejects on a network failure -- a 404/403
// still "succeeds" and writes the error JSON to disk, so the status is checked.
export async function downloadAttachment(
  endpointPath: string,
  cacheName: string,
  file: AttachmentFile,
  token: string | null,
): Promise<DownloadedFile | null> {
  const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uri = `${FileSystem.cacheDirectory}${cacheName}-${file.id}-${safeName}`;
  const result = await FileSystem.downloadAsync(`${api.defaults.baseURL}${endpointPath}`, uri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    return null;
  }
  return { uri: result.uri, filename: file.filename, mimeType: resolveMimeType(file) };
}

export async function shareFile(file: DownloadedFile): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
    return;
  }
  await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, dialogTitle: file.filename });
}

// Android: ACTION_VIEW on a content:// URI with read permission, so the
// phone's own PDF/Word app opens the file. Not awaited to completion -- the
// promise only resolves when the user comes back -- but a missing viewer app
// rejects right away, which falls back to the Share sheet.
function openInAndroidViewer(file: DownloadedFile): Promise<void> {
  return FileSystem.getContentUriAsync(file.uri).then((contentUri) => {
    IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: file.mimeType,
      flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
    }).catch(() => {
      shareFile(file).catch((err) => console.error('Share fallback failed:', err));
    });
  });
}

// Decides what happens with a downloaded file. Returns the file when the
// caller should show it in ImagePreviewOverlay, otherwise null.
export async function presentDownloadedFile(file: DownloadedFile): Promise<DownloadedFile | null> {
  if (isImageMime(file.mimeType)) return file;
  if (Platform.OS === 'android' && ANDROID_VIEWER_MIMES.has(file.mimeType)) {
    try {
      await openInAndroidViewer(file);
      return null;
    } catch (err) {
      console.error('Could not open in viewer, falling back to share:', err);
    }
  }
  await shareFile(file);
  return null;
}
