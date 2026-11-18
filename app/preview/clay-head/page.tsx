import type { Metadata } from 'next';
import { HeadStudy } from './study';

export const metadata: Metadata = {
  title: 'Clay portrait study | Mark Whitley',
  robots: {index: false, follow: false},
};

export default function ClayHeadPreview() {
  return <HeadStudy/>;
}
