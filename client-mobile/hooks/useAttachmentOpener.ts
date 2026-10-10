import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  downloadAttachment,
  presentDownloadedFile,
  type AttachmentFile,
  type DownloadedFile,
} from '@/utils/openAttachment';

// One hook per screen: tracks which file is downloading and which image is
// being previewed. Render <ImagePreviewOverlay file={previewFile} ... /> once
// in the screen (inside the Modal it was opened from, if any).
export function useAttachmentOpener() {
  const { token } = useAuth();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<DownloadedFile | null>(null);

  const openAttachment = useCallback(
    async (endpointPath: string, cacheName: string, file: AttachmentFile) => {
      if (openingId) return;
      setOpeningId(file.id);
      try {
        const downloaded = await downloadAttachment(endpointPath, cacheName, file, token);
        if (!downloaded) {
          Alert.alert('Error', 'Could not open the file.');
          return;
        }
        const toPreview = await presentDownloadedFile(downloaded);
        if (toPreview) setPreviewFile(toPreview);
      } catch (err: any) {
        console.error('Failed to open attachment:', err);
        const offline = !err?.response && /network|internet|offline/i.test(String(err?.message ?? ''));
        Alert.alert(
          offline ? 'You are offline' : 'Error',
          offline ? 'Attachments need an internet connection to open.' : 'Could not open the file.',
        );
      } finally {
        setOpeningId(null);
      }
    },
    [openingId, token],
  );

  const closePreview = useCallback(() => setPreviewFile(null), []);

  return { openingId, previewFile, openAttachment, closePreview };
}
