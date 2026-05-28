export interface BeatCard {
  id: string;
  name: string;
  bpm: number;
  spotifyUrl: string;
  spotifyUri: string;
}

export interface ChallengeCard {
  id: string;
  category: 'palabras' | 'tematicas' | 'cypher' | 'terminaciones' | 'beatbox' | '1v1' | 'sacrificio';
  title: string;
  description: string;
  // Para la categoría "palabras", guardamos la lista de 4 palabras arriba y 4 palabras abajo
  wordsTop?: string[];
  wordsBottom?: string[];
  // Para la categoría "terminaciones" o palabras clave
  highlightText?: string;
  // Para beatbox o desafíos con tiempos/detalles específicos
  timeLimit?: number; // en segundos
}

export const BEATS_DECK: BeatCard[] = [
  {
    id: 'beat-1',
    name: 'RUIDA 86',
    bpm: 86,
    spotifyUrl: 'https://open.spotify.com/track/4PTG3Z6ehGkBF3sI7Wq2Ag',
    spotifyUri: 'spotify:track:4PTG3Z6ehGkBF3sI7Wq2Ag'
  },
  {
    id: 'beat-2',
    name: 'CITRICO 93',
    bpm: 93,
    spotifyUrl: 'https://open.spotify.com/track/17dZsnvjQkXUWh6Sifg6hV',
    spotifyUri: 'spotify:track:17dZsnvjQkXUWh6Sifg6hV'
  },
  {
    id: 'beat-3',
    name: 'CHOCOLATADA 91',
    bpm: 91,
    spotifyUrl: 'https://open.spotify.com/track/5QdA5bEwS1hRzWbTep7XjO',
    spotifyUri: 'spotify:track:5QdA5bEwS1hRzWbTep7XjO'
  },
  {
    id: 'beat-4',
    name: 'RAMEN 89',
    bpm: 89,
    spotifyUrl: 'https://open.spotify.com/track/27O7B27xW3g3G0c4xX4Xp3',
    spotifyUri: 'spotify:track:27O7B27xW3g3G0c4xX4Xp3'
  },
  {
    id: 'beat-5',
    name: 'PAN CASERO 91',
    bpm: 91,
    spotifyUrl: 'https://open.spotify.com/track/3zHn2l3j8RSpYyGf9H2D3B',
    spotifyUri: 'spotify:track:3zHn2l3j8RSpYyGf9H2D3B'
  },
  {
    id: 'beat-6',
    name: 'ESPEJO 87',
    bpm: 87,
    spotifyUrl: 'https://open.spotify.com/track/4F4B3z4c1D2e3f4g5h6i7j',
    spotifyUri: 'spotify:track:4F4B3z4c1D2e3f4g5h6i7j'
  },
  {
    id: 'beat-7',
    name: 'LA REINA 152',
    bpm: 152,
    spotifyUrl: 'https://open.spotify.com/track/5G5H5i5j5k5l5m5n5o5p5q',
    spotifyUri: 'spotify:track:5G5H5i5j5k5l5m5n5o5p5q'
  },
  {
    id: 'beat-8',
    name: 'PULSO 120',
    bpm: 120,
    spotifyUrl: 'https://open.spotify.com/track/6Q6R6s6t6u6v6w6x6y6z6A',
    spotifyUri: 'spotify:track:6Q6R6s6t6u6v6w6x6y6z6A'
  }
];

export const CHALLENGES_DECK: ChallengeCard[] = [
  // Categoria: Palabras
  {
    id: 'challenge-p1',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['FRUTA', 'GUITARRA', 'BONDI', 'KIOSKO'],
    wordsBottom: ['VEREDA', 'MADRUGADA', 'BARRIO', 'SUPERMERCADO']
  },
  {
    id: 'challenge-p2',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['PLAYA', 'BICICLETA', 'HELADERO', 'ZAPATO'],
    wordsBottom: ['SOMBRERO', 'TELEVISOR', 'PIZZA', 'MONTAÑA']
  },
  {
    id: 'challenge-p3',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['CÁMARA', 'LÁMPARA', 'MOCHILA', 'GUITARRA'],
    wordsBottom: ['PERRO', 'LIBRO', 'ZAPATO', 'MONEDA']
  },
  {
    id: 'challenge-p4',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['CORRER', 'CANTAR', 'BAILAR', 'SALTAR'],
    wordsBottom: ['VENTANA', 'GUITARRA', 'MOCHILA', 'PLANETA']
  },
  {
    id: 'challenge-p5',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['RÍO', 'VENTANA', 'SILLA', 'NUBE'],
    wordsBottom: ['FUEGO', 'MESA', 'LUNA', 'ÁRBOL']
  },
  {
    id: 'challenge-p6',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['FARO', 'COHETE', 'TECLADO', 'GLOBO'],
    wordsBottom: ['SELVA', 'PATINETA', 'HOSPITAL', 'CEREBRO']
  },
  {
    id: 'challenge-p7',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['DRAGÓN', 'AVIÓIN', 'PARAGUAS', 'TAMBOR'],
    wordsBottom: ['GATO', 'BICHO', 'LINTERNA', 'COCODRILO']
  },
  {
    id: 'challenge-p8',
    category: 'palabras',
    title: 'PALABRAS',
    description: 'Improvisa usando las palabras de tu lado. Tu oponente usa las palabras del lado contrario.',
    wordsTop: ['SELVA', 'PATINETA', 'HOSPITAL', 'CEREBRO'],
    wordsBottom: ['ÁRBOL', 'TELEVISOR', 'MONTAÑA', 'PIZZA']
  },

  // Categoria: Tematicas
  {
    id: 'challenge-t1',
    category: 'tematicas',
    title: 'LOS SUEÑOS',
    description: '¿CUÁLES SON TUS SUEÑOS?',
    highlightText: 'SUEÑOS'
  },
  {
    id: 'challenge-t2',
    category: 'tematicas',
    title: 'FIN DEL MUNDO',
    description: '¿QUÉ HARÍAS SI MAÑANA SE TERMINA TODO?',
    highlightText: 'APOCALIPSIS'
  },
  {
    id: 'challenge-t3',
    category: 'tematicas',
    title: 'AÑO 2099',
    description: '¿CÓMO SERÁ EL MUNDO EN EL FUTURO?',
    highlightText: 'FUTURO'
  },
  {
    id: 'challenge-t4',
    category: 'tematicas',
    title: 'MIEDOS',
    description: '¿CUÁLES SON TUS MIEDOS?',
    highlightText: 'FOBIAS'
  },
  {
    id: 'challenge-t5',
    category: 'tematicas',
    title: 'LA RUTINA',
    description: '¿CUÁL SERÍA TU RUTINA IDEAL?',
    highlightText: 'DÍA A DÍA'
  },

  // Categoria: Cypher
  {
    id: 'challenge-c1',
    category: 'cypher',
    title: 'CYPHER',
    description: 'Ronda libre en equipo compartiendo el micro. Formato 4x4 continuo.',
    highlightText: '"EQUIPO"'
  },
  {
    id: 'challenge-c2',
    category: 'cypher',
    title: 'CYPHER',
    description: 'Ronda libre en equipo compartiendo el micro. Formato 4x4 continuo.',
    highlightText: '"AMISTAD"'
  },

  // Categoria: Terminaciones
  {
    id: 'challenge-e1',
    category: 'terminaciones',
    title: 'TERMINACIONES',
    description: 'Rima obligatoriamente utilizando la terminación indicada en cada patrón.',
    highlightText: '-ER'
  },
  {
    id: 'challenge-e2',
    category: 'terminaciones',
    title: 'TERMINACIONES',
    description: 'Rima obligatoriamente utilizando la terminación indicada en cada patrón.',
    highlightText: '-IO'
  },
  {
    id: 'challenge-e3',
    category: 'terminaciones',
    title: 'TERMINACIONES',
    description: 'Rima obligatoriamente utilizando la terminación indicada en cada patrón.',
    highlightText: '-ANDO / -ENDO'
  },
  {
    id: 'challenge-e4',
    category: 'terminaciones',
    title: 'TERMINACIONES',
    description: 'Rima obligatoriamente utilizando la terminación indicada en cada patrón.',
    highlightText: '-AR'
  },

  // Categoria: Beatbox
  {
    id: 'challenge-b1',
    category: 'beatbox',
    title: 'BEATBOX',
    description: 'Elige a un compañero para que haga beatbox como base instrumental durante la ronda. ¡Usa el cronómetro!',
    highlightText: 'VIAJE',
    timeLimit: 90
  },
  {
    id: 'challenge-b2',
    category: 'beatbox',
    title: 'BEATBOX',
    description: 'Elige a un compañero para que haga beatbox como base instrumental durante la ronda. ¡Usa el cronómetro!',
    highlightText: 'CARRERA',
    timeLimit: 90
  },

  // Categoria: 1v1
  {
    id: 'challenge-1v1-1',
    category: '1v1',
    title: 'BATALLA 1V1',
    description: 'Enfréntate cara a cara en un duelo conceptual.',
    highlightText: 'LUZ VS OSCURIDAD'
  },
  {
    id: 'challenge-1v1-2',
    category: '1v1',
    title: 'BATALLA 1V1',
    description: 'Enfréntate cara a cara en un duelo conceptual.',
    highlightText: 'AGUA VS FUEGO'
  },

  // Categoria: El Sacrificio
  {
    id: 'challenge-s1',
    category: 'sacrificio',
    title: 'EL SACRIFICIO',
    description: '¿CUÁNTO TE ESFORZASTE? La ronda definitiva donde se evalúa la entrega y energía total.',
    highlightText: 'ENTREGA MÁXIMA'
  }
];
