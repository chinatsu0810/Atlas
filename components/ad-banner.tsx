'use client';

import { useEffect, useState } from 'react';

type Ad = {
  href: string;
  imgSrc: string;
  width: number;
  height: number;
  pixelSrc: string;
};

const ADS: Ad[] = [
  {
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+4T95TE+2PEO+1ICG3L',
    imgSrc:
      'https://www20.a8.net/svt/bgt?aid=260923668291&wid=001&eno=01&mid=s00000012624009128000&mc=1',
    width: 936,
    height: 120,
    pixelSrc: 'https://www16.a8.net/0.gif?a8mat=4BCHZO+4T95TE+2PEO+1ICG3L',
  },
  {
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+4BE5O2+2W74+639IP',
    imgSrc:
      'https://www21.a8.net/svt/bgt?aid=260923668261&wid=001&eno=01&mid=s00000013504001023000&mc=1',
    width: 320,
    height: 50,
    pixelSrc: 'https://www12.a8.net/0.gif?a8mat=4BCHZO+4BE5O2+2W74+639IP',
  },
];

export function AdBanner() {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    setAd(ADS[Math.floor(Math.random() * ADS.length)]);
  }, []);

  if (!ad) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400">広告</span>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href={ad.href} rel="nofollow noopener" target="_blank">
        <img
          src={ad.imgSrc}
          width={ad.width}
          height={ad.height}
          alt=""
          className="h-auto max-w-full"
        />
      </a>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ad.pixelSrc} width={1} height={1} alt="" className="hidden" />
    </div>
  );
}
