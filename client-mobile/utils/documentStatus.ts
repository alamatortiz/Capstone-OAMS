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
const HUB_STATUS_META: Record<CanonicalStatus, HubStatusMeta> = {
  pending: { label: 'Pending', icon: 'time-outline', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  processing: { label: 'Processing', icon: 'alert-circle-outline', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#3b82f6' },
  ready: { label: 'Ready', icon: 'checkmark-circle-outline', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  released: { label: 'Released', icon: 'checkmark-circle-outline', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  claimed: { label: 'Claimed', icon: 'checkmark-circle-outline', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  rejected: { label: 'Rejected', icon: 'close-circle-outline', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

const DETAIL_STATUS_META: Record<CanonicalStatus, DetailStatusMeta> = {
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  processing: { label: 'Processing', bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.35)', color: '#93c5fd' },
  ready: { label: 'Ready for Pickup', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  released: { label: 'Released', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  claimed: { label: 'Claimed', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' },
  rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' },
};

export function getHubStatusMeta(status: DocStatus): HubStatusMeta {
  return HUB_STATUS_META[normalizeDocStatus(status)];
}

export function getDetailStatusMeta(status: DocStatus): DetailStatusMeta {
  return DETAIL_STATUS_META[normalizeDocStatus(status)];
}
