import type { Photo } from '../../hooks/usePhotos';

interface Props {
  photos: Photo[];
  loading: boolean;
}

export function PhotoTimeline({ photos, loading }: Props) {
  if (loading) return <p>Loading photos...</p>;

  if (photos.length === 0) {
    return <p style={{ color: '#999' }}>No photos yet. Run a capture session to get started.</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
      {photos.map((photo) => (
        <div key={photo.url} style={{ position: 'relative' }}>
          <img
            src={photo.url}
            alt={photo.name}
            style={{ width: '100%', borderRadius: 4, display: 'block' }}
          />
          <span style={{
            position: 'absolute', bottom: 4, left: 4,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: 11, padding: '2px 6px', borderRadius: 3,
          }}>
            {new Date(photo.date).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
