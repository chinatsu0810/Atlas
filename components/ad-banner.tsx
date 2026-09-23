'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type ImageAd = {
  kind: 'image';
  id: string;
  href: string;
  imgSrc: string;
  width: number;
  height: number;
  pixelSrc: string;
};

type TextAd = {
  kind: 'text';
  id: string;
  href: string;
  label: string;
  pixelSrc: string;
};

type Ad = ImageAd | TextAd;

const ADS: Ad[] = [
  {
    kind: 'image',
    id: '260923668291',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+4T95TE+2PEO+1ICG3L',
    imgSrc:
      'https://www20.a8.net/svt/bgt?aid=260923668291&wid=001&eno=01&mid=s00000012624009128000&mc=1',
    width: 936,
    height: 120,
    pixelSrc: 'https://www16.a8.net/0.gif?a8mat=4BCHZO+4T95TE+2PEO+1ICG3L',
  },
  {
    kind: 'image',
    id: '260923668261',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+4BE5O2+2W74+639IP',
    imgSrc:
      'https://www21.a8.net/svt/bgt?aid=260923668261&wid=001&eno=01&mid=s00000013504001023000&mc=1',
    width: 320,
    height: 50,
    pixelSrc: 'https://www12.a8.net/0.gif?a8mat=4BCHZO+4BE5O2+2W74+639IP',
  },
  {
    kind: 'image',
    id: '260923668601',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9XTJCI+4X1W+NUMHT',
    imgSrc:
      'https://www23.a8.net/svt/bgt?aid=260923668601&wid=001&eno=01&mid=s00000022946004006000&mc=1',
    width: 640,
    height: 340,
    pixelSrc: 'https://www19.a8.net/0.gif?a8mat=4BCHZO+9XTJCI+4X1W+NUMHT',
  },
  {
    kind: 'image',
    id: '260923668600',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9X83QQ+4X1W+TSJ41',
    imgSrc:
      'https://www23.a8.net/svt/bgt?aid=260923668600&wid=001&eno=01&mid=s00000022946005004000&mc=1',
    width: 300,
    height: 250,
    pixelSrc: 'https://www13.a8.net/0.gif?a8mat=4BCHZO+9X83QQ+4X1W+TSJ41',
  },
  {
    kind: 'image',
    id: '260923668595',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9U8XPU+4GSM+I0SHD',
    imgSrc:
      'https://www22.a8.net/svt/bgt?aid=260923668595&wid=001&eno=01&mid=s00000020839003027000&mc=1',
    width: 320,
    height: 50,
    pixelSrc: 'https://www13.a8.net/0.gif?a8mat=4BCHZO+9U8XPU+4GSM+I0SHD',
  },
  {
    kind: 'image',
    id: '260923668591',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9RV7AQ+2JMM+6A4FL',
    imgSrc:
      'https://www24.a8.net/svt/bgt?aid=260923668591&wid=001&eno=01&mid=s00000011875001055000&mc=1',
    width: 728,
    height: 90,
    pixelSrc: 'https://www14.a8.net/0.gif?a8mat=4BCHZO+9RV7AQ+2JMM+6A4FL',
  },
  {
    kind: 'image',
    id: '260923668584',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9NP62A+5TBA+5Z6WX',
    imgSrc:
      'https://www26.a8.net/svt/bgt?aid=260923668584&wid=001&eno=01&mid=s00000027127001004000&mc=1',
    width: 120,
    height: 60,
    pixelSrc: 'https://www11.a8.net/0.gif?a8mat=4BCHZO+9NP62A+5TBA+5Z6WX',
  },
  {
    kind: 'image',
    id: '260923668583',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9N3QGI+5NG6+61JSH',
    imgSrc:
      'https://www21.a8.net/svt/bgt?aid=260923668583&wid=001&eno=01&mid=s00000026367001015000&mc=1',
    width: 320,
    height: 50,
    pixelSrc: 'https://www18.a8.net/0.gif?a8mat=4BCHZO+9N3QGI+5NG6+61JSH',
  },
  {
    kind: 'image',
    id: '260923668582',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9MIAUQ+4XZI+HVNAP',
    imgSrc:
      'https://www22.a8.net/svt/bgt?aid=260923668582&wid=001&eno=01&mid=s00000023067003003000&mc=1',
    width: 300,
    height: 250,
    pixelSrc: 'https://www16.a8.net/0.gif?a8mat=4BCHZO+9MIAUQ+4XZI+HVNAP',
  },
  {
    kind: 'image',
    id: '260923668581',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9LWV8Y+5XPM+5Z6WX',
    imgSrc:
      'https://www22.a8.net/svt/bgt?aid=260923668581&wid=001&eno=01&mid=s00000027697001004000&mc=1',
    width: 120,
    height: 60,
    pixelSrc: 'https://www14.a8.net/0.gif?a8mat=4BCHZO+9LWV8Y+5XPM+5Z6WX',
  },
  {
    kind: 'image',
    id: '260923668578',
    href: 'https://px.a8.net/svt/ejp?a8mat=4BCHZO+9K4KFM+4R2M+NU729',
    imgSrc:
      'https://www22.a8.net/svt/bgt?aid=260923668578&wid=001&eno=01&mid=s00000022171004004000&mc=1',
    width: 300,
    height: 250,
    pixelSrc: 'https://www13.a8.net/0.gif?a8mat=4BCHZO+9K4KFM+4R2M+NU729',
  },
];

const LAST_AD_STORAGE_KEY = 'atlas:footer-ad:last-id';

function pickAd(): Ad {
  let lastId: string | null = null;
  try {
    lastId = localStorage.getItem(LAST_AD_STORAGE_KEY);
  } catch {
    lastId = null;
  }

  const candidates = ADS.length > 1 ? ADS.filter((candidate) => candidate.id !== lastId) : ADS;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  try {
    localStorage.setItem(LAST_AD_STORAGE_KEY, chosen.id);
  } catch {
    // per-viewer convenience only; ignore if storage is unavailable
  }

  return chosen;
}

export function AdBanner() {
  const pathname = usePathname();
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    setAd(pickAd());
  }, [pathname]);

  if (!ad) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400">広告</span>

      {ad.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={ad.href} rel="nofollow noopener" target="_blank">
          <img
            src={ad.imgSrc}
            width={ad.width}
            height={ad.height}
            alt=""
            className="h-auto max-w-full"
          />
        </a>
      ) : (
        <a
          href={ad.href}
          rel="nofollow noopener"
          target="_blank"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          {ad.label}
        </a>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ad.pixelSrc} width={1} height={1} alt="" className="hidden" />
    </div>
  );
}
