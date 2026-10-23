import {
 EyeIcon, CctvCameraIcon, Door01Icon, DoorLockIcon, ShoppingBag01Icon,
 CheckmarkCircle02Icon, ArrowLeft01Icon, ArrowRight01Icon, PlayIcon, PauseIcon,
 RefreshIcon, Settings01Icon, DrinkIcon, Restaurant01Icon, FireIcon, PowerServiceIcon,
 Cancel01Icon, HelpCircleIcon,
} from '@hugeicons/core-free-icons';
/** One curated registry for DOM and headset buttons; no remote assets or icon font. */
export const actionIcons = {
 inspect:EyeIcon, camera:CctvCameraIcon, admit:Door01Icon, reject:DoorLockIcon,
 shop:ShoppingBag01Icon, equip:CheckmarkCircle02Icon, back:ArrowLeft01Icon,
 next:ArrowRight01Icon, play:PlayIcon, pause:PauseIcon, retry:RefreshIcon,
 settings:Settings01Icon, drink:DrinkIcon, food:Restaurant01Icon, cook:FireIcon,
 power:PowerServiceIcon, close:Cancel01Icon, question:HelpCircleIcon,
} as const;
export type ActionIconName=keyof typeof actionIcons;
export const actionLabels:Readonly<Record<string,ActionIconName>>={
 'Look again':'inspect','Look through peephole':'inspect','Inspect':'inspect',
 'View cameras':'camera','Cameras':'camera','Change camera':'camera','More cameras':'camera','View vent camera':'camera','View lounge camera':'camera','Back to CCTV':'camera',
 'Answer the door':'admit','Let in':'admit','Open door':'admit','Open doorway to aim · does not admit':'admit',
 'Send away':'reject','Close door':'reject',
 'Purchase':'shop','Buy':'shop','Shop':'shop','Hourly special':'shop','Hourly special · See this hour’s item':'shop',
 'Equip':'equip','Equipped':'equip','Equip set':'equip','Confirm':'equip','Remove':'close',
 'Take food':'food','Carrying food':'food','Get food from fridge':'food','Get food from the fridge first':'food','Collect and eat':'food',
 'Drink':'drink','Start cooking · 20s':'cook','Start cooking · 20 seconds':'cook',
 'Switch off / discard':'power','Switch off · discard food':'power',
 'Resume':'play','Resume game':'play','Start shift':'play','Start practice':'play','Start guided practice':'play',
 'Pause':'pause','Pause · Esc':'pause','Menu':'settings','Open menu':'settings','VR settings':'settings',
 'Movement':'settings','Comfort':'settings','Audio':'settings','Recenter':'settings','Recalibrate height':'settings',
 'Retry shift':'retry','Replay night':'retry','Retry camera':'retry','Reload game':'retry',
 'Back':'back','Go back':'back','Back to room':'back','Step away':'back','Back to shop':'back','Leave shop':'back','Return to lobby':'back','Back to lobby':'back',
 'Next':'next','Next night':'next','Skip to results':'next','Previous':'back',
 'Close':'close','Exit VR':'close','Exit tutorial':'close','Ask a question':'question',
};
export const iconForAction=(label:string):ActionIconName|undefined=>actionLabels[label];
