import type { Metadata } from 'next';
import { WorkspaceHome } from '@/components/workspace-home';
import { photographs, hasPlaceholders } from '@/data/photography';

type Props = { searchParams: Promise<{ view?: string; profile?: string }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { view } = await searchParams;
  const photography = view === 'photography';
  const title = photography ? 'Photography | Mark Whitley' : view === 'games' ? 'Games | Mark Whitley' : 'Mark Whitley | Product Design Engineer';
  const description = photography
    ? hasPlaceholders ? 'Selected photography — gallery preview. Original photography coming soon.' : 'Selected photographs by Mark Whitley. A collection of moments, places and perspectives.'
    : 'Product design, playful experiments and photography by Mark Whitley.';
  const url = photography ? '/?view=photography' : view === 'games' ? '/?view=games' : '/';
  const canonical = new URL(url, 'https://markwhitley.design').href;
  const preview = photographs.find(photo => photo.width > photo.height) || photographs[0];
  const variant = preview?.variants?.find(image => image.format === 'webp' && image.width >= 960);
  const images = photography && preview ? [{ url: new URL(variant?.src || preview.src, 'https://markwhitley.design').href, width: variant?.width || preview.width, height: variant?.height || preview.height, alt: preview.alt }] : undefined;
  // Next 15 drops query strings on root URLs when metadataBase is set. These URLs are already absolute.
  return { metadataBase: null, title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, images }, twitter: { card: 'summary_large_image', title, description, images } };
}
export default async function HomePage({ searchParams }: Props) {
  await searchParams;
  return <WorkspaceHome />;
}
