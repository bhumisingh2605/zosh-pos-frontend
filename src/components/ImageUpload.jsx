import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2, ImageOff } from 'lucide-react';
import { uploadImage } from '../api/uploads';
import { toast } from '../store/toastStore';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE_MB = 5;

export default function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, or WEBP images are allowed');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }
    setUploading(true);
    setProgress(0);
    setImgError(false);
    try {
      const { url } = await uploadImage(file, setProgress);
      onChange(url);
      toast.success('Photo uploaded.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="relative h-32 w-32 overflow-hidden rounded-sm border border-brass/30 bg-ledger-bg">
        {imgError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-text-muted">
            <ImageOff size={18} />
            <span className="text-[10px]">Couldn't load</span>
          </div>
        ) : (
          <img src={value} alt="Product" className="h-full w-full object-cover" onError={() => setImgError(true)} />
        )}
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <X size={13} />
        </button>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
      className={`flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed transition-colors ${
        dragOver ? 'border-ledger bg-brass-soft' : 'border-brass/30 hover:border-ledger'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {uploading ? (
        <>
          <Loader2 size={18} className="animate-spin text-ledger" />
          <span className="text-xs font-medium text-ledger">{progress}%</span>
        </>
      ) : (
        <>
          <ImagePlus size={18} className="text-ink-text-muted" />
          <span className="px-2 text-center text-[10px] leading-tight text-ink-text-muted">
            Click or drop a photo
          </span>
        </>
      )}
    </div>
  );
}