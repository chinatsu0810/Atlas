'use client';

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { ImagePlus, Loader2, X } from 'lucide-react';

import { MAX_IMAGES } from '@/lib/giveaways/constants';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * 写真を縮小し、JPEGに描き直す。
 * 描き直すことで、撮影場所などの位置情報（EXIF）は含まれなくなる。
 * スマートフォンの縦横の向きは、読み込み時に反映する。
 */
async function toSafeJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

export function GiveawayImageUploader({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);

    const room = MAX_IMAGES - value.length;
    const selected = Array.from(files).slice(0, room);

    if (files.length > room) {
      setError(`写真は${MAX_IMAGES}枚までです。`);
    }

    setUploading(selected.length);

    const uploaded: string[] = [];

    for (const file of selected) {
      try {
        const jpeg = await toSafeJpeg(file);
        const result = await upload(`giveaways/${crypto.randomUUID()}.jpg`, jpeg, {
          access: 'public',
          handleUploadUrl: '/api/giveaways/upload',
          contentType: 'image/jpeg',
        });
        uploaded.push(result.url);
      } catch (uploadError) {
        console.error(uploadError);
        setError(
          '読み込めない写真がありました。JPEG・PNG形式の写真でもう一度お試しください。'
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(url: string) {
    onChange(value.filter((item) => item !== url));
  }

  function moveFirst(url: string) {
    onChange([url, ...value.filter((item) => item !== url)]);
  }

  const canAdd = value.length + uploading < MAX_IMAGES && !disabled;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((url, index) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-xl border border-[#D8E7F0] bg-[#F4F8FA]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />

            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-[#1478B8] px-2 py-0.5 text-[10px] font-semibold text-white">
                表紙
              </span>
            ) : (
              <button
                type="button"
                onClick={() => moveFirst(url)}
                disabled={disabled}
                className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#35617E] shadow-sm"
              >
                表紙にする
              </button>
            )}

            <button
              type="button"
              onClick={() => remove(url)}
              disabled={disabled}
              aria-label="写真を削除"
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-[#4F6B80] shadow-sm hover:text-[#D14343]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: uploading }).map((_, index) => (
          <div
            key={`uploading-${index}`}
            className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#C9DFEA] bg-[#F8FBFD]"
          >
            <Loader2 className="h-5 w-5 animate-spin text-[#1478B8]" />
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#9EC6DF] bg-[#F8FBFD] text-xs font-medium text-[#1478B8] transition hover:bg-[#EAF4FB]"
          >
            <ImagePlus className="h-5 w-5" />
            写真を追加
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="mt-2 text-xs text-[#6B8498]">
        1〜{MAX_IMAGES}枚。1枚目が一覧に表示されます。写真の位置情報は、アップロード時に自動で削除されます。
      </p>
      <p className="mt-1 text-xs text-[#B45F06]">
        表札・郵便物・窓の外の景色など、住所や住まいが分かるものが写らないようにしてください。
      </p>

      {error && <p className="mt-1 text-xs text-[#D14343]">{error}</p>}
    </div>
  );
}
