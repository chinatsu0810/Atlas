import { statusInfo } from '@/lib/giveaways/constants';

export function GiveawayStatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}) {
  const info = statusInfo(status);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.className} ${className}`}
    >
      {info.label}
    </span>
  );
}
