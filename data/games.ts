export type Game = {
  slug: string; title: string; category: string; description: string; tone: string;
  artTitle: string; image?: string; alt?: string; platform?: string;
  metaStoreUrl?: string; comingSoon?: boolean;
};
export const games: Game[] = [
  {slug:'rally',title:'Pocket Rally',category:'Playable experiment',description:'Four clay rally cars. One forest stage. Keyboard or controller. Chase your best time.',tone:'rally',artTitle:'POCKET\nRALLY.',image:'/rally/previews/v42/forest-1-weather-clear.webp',alt:'Handmade miniature forest rally course'},
  {slug:'soccer98',title:'Football meets Snake',category:'Playable experiment',description:'Retro football meets Snake. Every ball adds a defender. How long can you keep running?',tone:'rally',artTitle:'SOCCER98.',image:'/soccer98/cover.svg',alt:'Retro striped football pitch with a black-and-white-shirted player chased by red defenders'},
  {slug:'the-anomalous',title:'The Anomalous',category:'Playable experiment · By Fenn',description:'A fresh face. A very long night. Explore the lobby, find your colour and meet the night shift. Keyboard & mouse, or touch controls in portrait and landscape.',tone:'deader',artTitle:'THE\nANOMALOUS',image:'/deader/cover.png',alt:'Dimly lit horror room with a chained wooden door and ladder'},
  {slug:'hallowseve26',title:'HallowsEve26',category:'Playable experiment',description:'Build a living Christmas kingdom, command a toy army and conquer the Halloween clans. Twelve nights. One Christmas to save. Play in landscape on mobile.',tone:'hallows',artTitle:'HALLOWS\nEVE26.'},
  {slug:'pocket-racers-vr',title:'Pocket Racers VR',category:'Mixed Reality / Meta Quest',platform:'Meta Quest',description:'Tiny racing, big thrills. A mixed-reality racing experience that brings miniature cars and tracks into your real-world space.',tone:'racers',artTitle:'POCKET\nRACERS VR.',image:'/portfolio/pocket-racers-vr.svg',alt:'Concept illustration of miniature cars racing on a coffee table in a sunlit living room',comingSoon:true,
    // Set the official Meta Horizon Store URL here when the listing is ready.
    metaStoreUrl: undefined},
];
export const pocketRacers = games.find(game => game.slug === 'pocket-racers-vr')!;
export function gameDestination(game: Game) {
  return game.metaStoreUrl || `/playground/${game.slug}`;
}
