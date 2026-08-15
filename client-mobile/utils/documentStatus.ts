import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// The faculty document-requests endpoint returns the raw DB enum value
// "generated" where student/admin endpoints already normalize it to
// "ready". "generated" is kept in the union (professor screens genuinely
// receive it over the wire) and normalizeDocStatus() is the one place
// it's treated as an alias of "ready" for display.
export type DocStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'generated'
  | 'released'
  | 'claimed'
  | 'rejected'
  | 'cancelled';

type CanonicalStatus = Exclude<DocStatus, 'generated'>;

export function normalizeDocStatus(status: DocStatus): CanonicalStatus {
  return status === 'generated' ? 'ready' : status;
}

interface HubStatusMeta {
  label: string;
  icon: IoniconName;
  bg: string;
  border: string;
  color: string;
}

interface DetailStatusMeta {
  label: string;
  bg: string;
  border: string;
  color: string;
}

// Colors verified directly against Student web's CSS (stud-documents.css /
// stud-document-status.css), the source of truth for this app. "Ready",
// "Released", and "Claimed" share one identical green on web — hub and
// detail, both roles, no distinction between them — so that one value is
// used for all three here too, rather than mobile's previous two-greens split.
const HUB_STATUS_META_DARK: Record<CanonicalStatus, HubStatusMeta> = {
  pending: { label: 'Pending', icon: 'time-outline', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  processing: { label: 'Processing', icon: 'alert-circle-outline', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' },
  ready: { label: 'Ready', icon: 'checkmark-circle-outline', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  released: { label: 'Released', icon: 'checkmark-circle-outline', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  claimed: { label: 'Claimed', icon: 'checkmark-circle-outline', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  rejected: { label: 'Rejected', icon: 'close-circle-outline', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

const HUB_STATUS_META_LIGHT: Record<CanonicalStatus, HubStatusMeta> = {
  pending: { label: 'Pending', icon: 'time-outline', bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)', color: '#92400e' },
  processing: { label: 'Processing', icon: 'alert-circle-outline', bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.25)', color: '#1d4ed8' },
  ready: { label: 'Ready', icon: 'checkmark-circle-outline', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  released: { label: 'Released', icon: 'checkmark-circle-outline', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  claimed: { label: 'Claimed', icon: 'checkmark-circle-outline', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  rejected: { label: 'Rejected', icon: 'close-circle-outline', bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#991b1b' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline', bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#991b1b' },
};

const DETAIL_STATUS_META_DARK: Record<CanonicalStatus, DetailStatusMeta> = {
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.35)', color: '#93c5fd' },
  ready: { label: 'Ready for Pickup', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  released: { label: 'Released', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  claimed: { label: 'Claimed', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

const DETAIL_STATUS_META_LIGHT: Record<CanonicalStatus, DetailStatusMeta> = {
  pending: { label: 'Pending', bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)', color: '#92400e' },
  processing: { label: 'Processing', bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.25)', color: '#1d4ed8' },
  ready: { label: 'Ready for Pickup', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  released: { label: 'Released', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  claimed: { label: 'Claimed', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.25)', color: '#065f46' },
  rejected: { label: 'Rejected', bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#991b1b' },
  cancelled: { label: 'Cancelled', bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.2)', color: '#991b1b' },
};

export function getHubStatusMeta(status: DocStatus, isDarkMode: boolean = true): HubStatusMeta {
  return (isDarkMode ? HUB_STATUS_META_DARK : HUB_STATUS_META_LIGHT)[normalizeDocStatus(status)];
}

export function getDetailStatusMeta(status: DocStatus, isDarkMode: boolean = true): DetailStatusMeta {
  return (isDarkMode ? DETAIL_STATUS_META_DARK : DETAIL_STATUS_META_LIGHT)[normalizeDocStatus(status)];
}
