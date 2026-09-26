import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { getUser } from '@/lib/db/queries';
import { MAX_IMAGE_BYTES } from '@/lib/giveaways/constants';

// 「譲る」の写真を、ブラウザから Vercel Blob へ直接アップロードするためのトークンを発行する。
// 写真はブラウザで縮小し、位置情報（EXIF）を消してから送る（components/giveaways/image-uploader.tsx）。
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getUser();

        if (!user) {
          throw new Error('ログインしてください。');
        }

        if (!pathname.startsWith('giveaways/')) {
          throw new Error('アップロード先が正しくありません。');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}
