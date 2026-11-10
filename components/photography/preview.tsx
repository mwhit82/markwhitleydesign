import {Icon} from '@/components/icon';
import {ArrowRight01Icon} from '@hugeicons/core-free-icons';
import Link from 'next/link';
/** Compatibility export; the full collection now lives in the homepage filter. */
export function PhotographyPreview(){return <Link href="/?view=photography">Explore photography <Icon icon={ArrowRight01Icon} size={18}/></Link>;}
