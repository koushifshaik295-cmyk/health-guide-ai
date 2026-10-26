export const COMPANION_HEROES: Record<
  string,
  {
    id: string;
    name: string;
    source: any;
    accentColor: string;
    title: string;
  }
> = {
  hero1: {
    id: 'hero1',
    name: 'Peddi (Hero 1)',
    source: require('../../assets/hero1.gif'), // or peddi.png
    accentColor: '#00E676',
    title: 'Hydration Captain',
  },
  pushpa: {
    id: 'pushpa',
    name: 'Pushpa Raj',
    source: require('../../assets/pushpa.png'),
    accentColor: '#FF9100',
    title: 'Stamina Leader',
  },
};