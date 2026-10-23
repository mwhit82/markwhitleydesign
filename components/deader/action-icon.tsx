import { HugeiconsIcon } from '@hugeicons/react';
import { actionIcons, type ActionIconName } from '@/lib/deader/action-icons';
import styles from './game.module.css';
export function ActionIcon({name}:{name:ActionIconName}) {
 return <HugeiconsIcon icon={actionIcons[name]} className={styles.actionIcon} size={20} strokeWidth={1.5} aria-hidden="true" focusable="false"/>;
}
