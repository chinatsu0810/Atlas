import { findPlace, findRegion, findTheme } from './data';

// 運営画面などに出す「インド・デリー / グルガオン・学校・教育」のような表記
export function guideTargetLabel(countrySlug: string, regionSlug: string, themeKey: string) {
  const place = findPlace(countrySlug);
  const region = place && findRegion(place, regionSlug);
  const theme = findTheme(themeKey);
  return [place?.name ?? countrySlug, region?.name ?? regionSlug, theme?.label ?? themeKey].join('・');
}
