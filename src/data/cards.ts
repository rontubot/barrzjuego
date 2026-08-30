export interface BeatCard {
  id: string;
  name: string;
  bpm: number;
  spotifyUrl: string;
  spotifyUri: string;
  audioUrl?: string;
}

export interface ChallengeCard {
  id: string;
  category: 'palabras' | 'tematicas' | 'terminaciones' | 'beatbox' | 'versus' | 'freestyle';
  title: string;
  description: string;
  wordsTop?: string[];
  wordsBottom?: string[];
  highlightText?: string;
  timeLimit?: number; // en segundos
  imageUrl?: string;
}

export const BEATS_DECK: BeatCard[] = [
  {
    id: 'beat-1',
    name: 'Pan casero 80',
    bpm: 80,
    spotifyUrl: 'https://open.spotify.com/track/2rraMyumwdlBQsXXpqN7gF',
    spotifyUri: 'spotify:track:2rraMyumwdlBQsXXpqN7gF',
    audioUrl: '/soundtracks/BEATS/BEAT 26 80 BPM.wav'
  },
  {
    id: 'beat-2',
    name: 'Ruida 87',
    bpm: 87,
    spotifyUrl: 'https://open.spotify.com/track/76KOvzubs4yxj4y5MAVvRp',
    spotifyUri: 'spotify:track:76KOvzubs4yxj4y5MAVvRp',
    audioUrl: '/soundtracks/BEATS/RUIDA 87.wav'
  },
  {
    id: 'beat-3',
    name: 'Falta envido 87',
    bpm: 87,
    spotifyUrl: 'https://open.spotify.com/track/1flIwQRB3DkZZqJAf8xknI',
    spotifyUri: 'spotify:track:1flIwQRB3DkZZqJAf8xknI',
    audioUrl: '/soundtracks/BEATS/BEAT 29 87BPM.wav'
  },
  {
    id: 'beat-4',
    name: 'Chocolatada 88',
    bpm: 88,
    spotifyUrl: 'https://open.spotify.com/track/1rX4oWJVtGturbpUriWRI0',
    spotifyUri: 'spotify:track:1rX4oWJVtGturbpUriWRI0',
    audioUrl: '/soundtracks/BEATS/BEAT 25 88 BPM.wav'
  },
  {
    id: 'beat-5',
    name: 'Scaloneta 89',
    bpm: 89,
    spotifyUrl: 'https://open.spotify.com/track/4c0xaoCtA9bGPOFkRdY1f3',
    spotifyUri: 'spotify:track:4c0xaoCtA9bGPOFkRdY1f3',
    audioUrl: '/soundtracks/BEATS/BEAT 21 89 BPM.wav'
  },
  {
    id: 'beat-6',
    name: 'Román 90',
    bpm: 90,
    spotifyUrl: 'https://open.spotify.com/track/4QXmJ5NBSNtrruORZPPIPx',
    spotifyUri: 'spotify:track:4QXmJ5NBSNtrruORZPPIPx',
    audioUrl: '/soundtracks/BEATS/BEAT 18 90 BPM.wav'
  },
  {
    id: 'beat-7',
    name: 'Bazooka 90',
    bpm: 90,
    spotifyUrl: 'https://open.spotify.com/track/6wIDnXuIpV4tvyysRn1qWi',
    spotifyUri: 'spotify:track:6wIDnXuIpV4tvyysRn1qWi',
    audioUrl: '/soundtracks/BEATS/BEAT 19 90 BPM.wav'
  },
  {
    id: 'beat-8',
    name: 'Kelengue 92',
    bpm: 92,
    spotifyUrl: 'https://open.spotify.com/track/3YMVzs9ejblNzh0e4tYZt2',
    spotifyUri: 'spotify:track:3YMVzs9ejblNzh0e4tYZt2',
    audioUrl: '/soundtracks/BEATS/BEAT 11 92 BPM.wav'
  },
  {
    id: 'beat-9',
    name: 'La jefa 93',
    bpm: 93,
    spotifyUrl: 'https://open.spotify.com/track/731uRoun8fAUbAYF6FxP3e',
    spotifyUri: 'spotify:track:731uRoun8fAUbAYF6FxP3e',
    audioUrl: '/soundtracks/BEATS/BEAT 28-93 BPM wav.wav'
  },
  {
    id: 'beat-10',
    name: 'Modo diablo 94',
    bpm: 94,
    spotifyUrl: 'https://open.spotify.com/track/2oYT8ibR6ktUhIrS5HgqQf',
    spotifyUri: 'spotify:track:2oYT8ibR6ktUhIrS5HgqQf',
    audioUrl: '/soundtracks/BEATS/MODO DIABLO 94.wav'
  },
  {
    id: 'beat-11',
    name: 'Gomagoma 95',
    bpm: 95,
    spotifyUrl: 'https://open.spotify.com/track/5BeT6hZzcWGolqDat6wPBd',
    spotifyUri: 'spotify:track:5BeT6hZzcWGolqDat6wPBd',
    audioUrl: '/soundtracks/BEATS/BEAT 30 95 BPM.wav'
  },
  {
    id: 'beat-12',
    name: 'Eclípse 108',
    bpm: 108,
    spotifyUrl: 'https://open.spotify.com/track/43Fgt9Rh9iWrC4sTcwoSMy',
    spotifyUri: 'spotify:track:43Fgt9Rh9iWrC4sTcwoSMy',
    audioUrl: '/soundtracks/BEATS/BEAT 24 108 BPM.wav'
  },
  {
    id: 'beat-13',
    name: 'El quinto 130',
    bpm: 130,
    spotifyUrl: 'https://open.spotify.com/track/0I3yyAZ94uo3Gqxsvc2L2i',
    spotifyUri: 'spotify:track:0I3yyAZ94uo3Gqxsvc2L2i',
    audioUrl: '/soundtracks/BEATS/BEAT 20  130 BPM.wav'
  },
  {
    id: 'beat-14',
    name: 'La bestia 140',
    bpm: 140,
    spotifyUrl: 'https://open.spotify.com/track/6lGGOIaKNMndZUAVvtOYXP',
    spotifyUri: 'spotify:track:6lGGOIaKNMndZUAVvtOYXP',
    audioUrl: '/soundtracks/BEATS/BEAT 22 140 BPM.wav'
  },
  {
    id: 'beat-15',
    name: 'Cítrico 146',
    bpm: 146,
    spotifyUrl: 'https://open.spotify.com/track/1WSWpomyMvudAGbuXHzxNQ',
    spotifyUri: 'spotify:track:1WSWpomyMvudAGbuXHzxNQ',
    audioUrl: '/soundtracks/BEATS/BEAT 27 146 BPM.wav'
  }
];

export const CHALLENGES_DECK: ChallengeCard[] = [
  {
    id: 'challenge-palabras-1',
    category: 'palabras',
    title: 'Palabras 1',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 1.png'
  },
  {
    id: 'challenge-palabras-2',
    category: 'palabras',
    title: 'Palabras 2',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 2.png'
  },
  {
    id: 'challenge-palabras-3',
    category: 'palabras',
    title: 'Palabras 3',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 3.png'
  },
  {
    id: 'challenge-palabras-4',
    category: 'palabras',
    title: 'Palabras 4',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 4.png'
  },
  {
    id: 'challenge-palabras-5',
    category: 'palabras',
    title: 'Palabras 5',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 5.png'
  },
  {
    id: 'challenge-palabras-6',
    category: 'palabras',
    title: 'Palabras 6',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 6.png'
  },
  {
    id: 'challenge-palabras-7',
    category: 'palabras',
    title: 'Palabras 7',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 7.png'
  },
  {
    id: 'challenge-palabras-8',
    category: 'palabras',
    title: 'Palabras 8',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 8.png'
  },
  {
    id: 'challenge-palabras-9',
    category: 'palabras',
    title: 'Palabras 9',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 9.png'
  },
  {
    id: 'challenge-palabras-10',
    category: 'palabras',
    title: 'Palabras 10',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 10.png'
  },
  {
    id: 'challenge-palabras-11',
    category: 'palabras',
    title: 'Palabras 11',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 11.png'
  },
  {
    id: 'challenge-palabras-12',
    category: 'palabras',
    title: 'Palabras 12',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 12.png'
  },
  {
    id: 'challenge-palabras-13',
    category: 'palabras',
    title: 'Palabras 13',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 13.png'
  },
  {
    id: 'challenge-palabras-14',
    category: 'palabras',
    title: 'Palabras 14',
    description: 'Desafío de palabras',
    imageUrl: '/CARTAS DESAFIO/palabras 14.png'
  },
  {
    id: 'challenge-tematicas-1',
    category: 'tematicas',
    title: 'Villanos',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica villanos.png'
  },
  {
    id: 'challenge-tematicas-2',
    category: 'tematicas',
    title: 'Videojuegos',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica videojuegos.png'
  },
  {
    id: 'challenge-tematicas-3',
    category: 'tematicas',
    title: 'Superhéroes',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica superheroes.png'
  },
  {
    id: 'challenge-tematicas-4',
    category: 'tematicas',
    title: 'Películas',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica películas.png'
  },
  {
    id: 'challenge-tematicas-5',
    category: 'tematicas',
    title: 'Países',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica paises.png'
  },
  {
    id: 'challenge-tematicas-6',
    category: 'tematicas',
    title: 'Marcas',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica marcas.png'
  },
  {
    id: 'challenge-tematicas-7',
    category: 'tematicas',
    title: 'Fútbol',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica fútbol.png'
  },
  {
    id: 'challenge-tematicas-8',
    category: 'tematicas',
    title: 'En el Fin del Mundo',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica el fin del mundo.png'
  },
  {
    id: 'challenge-tematicas-9',
    category: 'tematicas',
    title: 'El Pasado',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica el pasado.png'
  },
  {
    id: 'challenge-tematicas-10',
    category: 'tematicas',
    title: 'De dónde venís y a dónde vas',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica de donde venis.png'
  },
  {
    id: 'challenge-tematicas-11',
    category: 'tematicas',
    title: 'Cuáles son tus sueños',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica sueños.png'
  },
  {
    id: 'challenge-tematicas-12',
    category: 'tematicas',
    title: 'Comida',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica comida.png'
  },
  {
    id: 'challenge-tematicas-13',
    category: 'tematicas',
    title: 'Bandas de Rock',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica bandas de rock.png'
  },
  {
    id: 'challenge-tematicas-14',
    category: 'tematicas',
    title: 'Año 3000',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica año 3000.png'
  },
  {
    id: 'challenge-tematicas-15',
    category: 'tematicas',
    title: 'Animales',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica animales.png'
  },
  {
    id: 'challenge-tematicas-16',
    category: 'tematicas',
    title: 'Qué harías con un millón de dólares',
    description: 'Desafío de temática',
    imageUrl: '/CARTAS DESAFIO/tematica millon de dolares.png'
  },
  {
    id: 'challenge-freestyle-libre',
    category: 'freestyle',
    title: 'Freestyle Libre',
    description: 'Improvisación libre sobre el beat',
    imageUrl: '/CARTAS DESAFIO/freestyle libre.png'
  },
  {
    id: 'challenge-terminaciones-ad',
    category: 'terminaciones',
    title: '-ad',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -ad.png'
  },
  {
    id: 'challenge-terminaciones-ado',
    category: 'terminaciones',
    title: '-ado',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -ado.png'
  },
  {
    id: 'challenge-terminaciones-ando',
    category: 'terminaciones',
    title: '-ando',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -ando.png'
  },
  {
    id: 'challenge-terminaciones-ar',
    category: 'terminaciones',
    title: '-ar',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -ar.png'
  },
  {
    id: 'challenge-terminaciones-carlos',
    category: 'terminaciones',
    title: 'Carlos',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -carlos.png'
  },
  {
    id: 'challenge-terminaciones-eo',
    category: 'terminaciones',
    title: 'EO',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -eo.png'
  },
  {
    id: 'challenge-terminaciones-er',
    category: 'terminaciones',
    title: '-er',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -er.png'
  },
  {
    id: 'challenge-terminaciones-ito',
    category: 'terminaciones',
    title: '-ito',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -ito.png'
  },
  {
    id: 'challenge-terminaciones-a',
    category: 'terminaciones',
    title: 'Á',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones -á.png'
  },
  {
    id: 'challenge-terminaciones-esdrujulas',
    category: 'terminaciones',
    title: 'Esdrújulas',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones esdrújulas.png'
  },
  {
    id: 'challenge-terminaciones-ion',
    category: 'terminaciones',
    title: 'IÓN',
    description: 'Desafío de terminaciones',
    imageUrl: '/CARTAS DESAFIO/terminaciones ión.png'
  },
  {
    id: 'challenge-beatbox-1',
    category: 'beatbox',
    title: 'Beatbox 1: We Will Rock You',
    description: 'Desafío de beatbox',
    imageUrl: '/CARTAS DESAFIO/beatbox 1 we wil rock u.png',
    timeLimit: 60
  },
  {
    id: 'challenge-beatbox-2',
    category: 'beatbox',
    title: 'Beatbox 2: Sueños',
    description: 'Desafío de beatbox',
    imageUrl: '/CARTAS DESAFIO/beatbox 2 suenos.png',
    timeLimit: 60
  },
  {
    id: 'challenge-beatbox-3',
    category: 'beatbox',
    title: 'Beatbox 2: Viajes',
    description: 'Desafío de beatbox',
    imageUrl: '/CARTAS DESAFIO/beatbox 3 viajes.png',
    timeLimit: 60
  },
  {
    id: 'challenge-beatbox-4',
    category: 'beatbox',
    title: 'Beatbox 4: Ritmo',
    description: 'Desafío de beatbox',
    imageUrl: '/CARTAS DESAFIO/beatbox 4 RITMO.png',
    timeLimit: 60
  },
  {
    id: 'challenge-versus-1',
    category: 'versus',
    title: 'Villano vs Superhéroe',
    description: 'Desafío versus',
    imageUrl: '/CARTAS DESAFIO/versus villano vs superhero.png'
  },
  {
    id: 'challenge-versus-2',
    category: 'versus',
    title: 'Pasado vs Futuro',
    description: 'Desafío versus',
    imageUrl: '/CARTAS DESAFIO/versus pasado vs futuro.png'
  },
  {
    id: 'challenge-versus-3',
    category: 'versus',
    title: 'Messi vs Maradona',
    description: 'Desafío versus',
    imageUrl: '/CARTAS DESAFIO/versus Messi vs Maradonna.png'
  },
  {
    id: 'challenge-versus-4',
    category: 'versus',
    title: 'Dinero vs Amor',
    description: 'Desafío versus',
    imageUrl: '/CARTAS DESAFIO/versus dinero vs amor.png'
  },
  {
    id: 'challenge-versus-5',
    category: 'versus',
    title: 'Campo vs Ciudad',
    description: 'Desafío versus',
    imageUrl: '/CARTAS DESAFIO/versus campo vs ciudad.png'
  },
  {
    id: 'challenge-versus-6',
    category: 'versus',
    title: 'Desafía a alguien',
    description: 'Desafío versus',
    imageUrl: '/CARTAS DESAFIO/Versus desafía a alguien.png'
  }
];
