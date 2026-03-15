import type { Photo } from '../../hooks/usePhotos';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

interface Props {
  photos: Photo[];
  loading: boolean;
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function PhotoTimeline({ photos, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<CameraIcon className="w-10 h-10" />}
        title="No photos yet"
        description="Photos will appear here after a capture session."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.url} className="relative group">
          <img
            src={photo.url}
            alt={photo.name}
            className="w-full aspect-square object-cover rounded-lg"
          />
          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[11px] px-1.5 py-0.5 rounded">
            {new Date(photo.date).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
