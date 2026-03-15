import { useEffect } from 'react';

interface PhotoLightboxProps {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export function PhotoLightbox({ open, src, alt, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/80" />
      <img
        src={src}
        alt={alt}
        className="relative max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
