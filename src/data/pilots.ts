export interface Pilot {
  id: string
  name: string
  callsign?: string
  years: string
  nationality: string
  tags: string[]
  bio: string
  quote?: string
  image: string
}

export const PILOTS: Pilot[] = [
  {
    id: 'earhart',
    name: 'Amelia Earhart',
    callsign: 'Lady Lindy',
    years: '1897 – 1937',
    nationality: 'American',
    tags: ['Firsts', 'Record Breaker'],
    bio: 'First woman to fly solo across the Atlantic. Set numerous records, pushed for women in aviation, and disappeared over the Pacific in 1937 during her attempt to circumnavigate the globe.',
    quote: 'Please know I am quite aware of the hazards. I want to do it because I want to do it.',
    image: '/pilots/Amelia_Earhart.jpg',
  },
  {
    id: 'yeager',
    name: 'Chuck Yeager',
    callsign: 'Glamorous Glennis',
    years: '1923 – 2020',
    nationality: 'American',
    tags: ['Test Pilot', 'Mach 1'],
    bio: 'First person to break the sound barrier in the Bell X-1. WWII ace with 13 victories. Continued as a test pilot and trainer, mentoring generations of aviators.',
    quote: 'The will to win is worthless if you do not have the will to prepare.',
    image: '/pilots/Chuck_Yeager.jpg',
  },
  {
    id: 'sullenberger',
    name: 'Chesley Sullenberger',
    callsign: 'Sully',
    years: '1951 –',
    nationality: 'American',
    tags: ['Miracle on the Hudson', 'Airline'],
    bio: 'US Airways Flight 1549 captain who safely ditched an A320 in the Hudson River after dual bird strike, saving all 155 people on board. Later became a safety advocate.',
    quote: 'We were trained to fly airplanes, not to be heroes. But sometimes training and courage intersect.',
    image: '/pilots/Chesley_Sullenberger.jpg',
  },
  {
    id: 'coleman',
    name: 'Bessie Coleman',
    years: '1892 – 1926',
    nationality: 'American',
    tags: ['Trailblazer', 'Firsts'],
    bio: 'First African-American woman and first Native American woman to hold a pilot license. Denied entry to American flight schools, she learned French and earned her license in France.',
    quote: 'I refused to take no for an answer.',
    image: '/pilots/Bessie_Coleman.jpg',
  },
  {
    id: 'hughes',
    name: 'Howard Hughes',
    years: '1905 – 1976',
    nationality: 'American',
    tags: ['Record Breaker', 'Designer'],
    bio: 'Aviator, engineer, and film producer. Set the transcontinental air speed record in 1937. Flew around the world in 91 hours in 1938. Designed and flew the H-4 Hercules "Spruce Goose."',
    image: '/pilots/Howard_Hughes.jpg',
  },
  {
    id: 'post',
    name: 'Wiley Post',
    years: '1898 – 1935',
    nationality: 'American',
    tags: ['Record Breaker', 'Solo'],
    bio: 'First pilot to fly solo around the world. Developed the pressure suit for high-altitude flight. Died with Will Rogers in a plane crash in Alaska.',
    image: '/pilots/Wiley_Post.jpg',
  },
  {
    id: 'doolittle',
    name: 'Jimmy Doolittle',
    callsign: 'Jimmy',
    years: '1896 – 1993',
    nationality: 'American',
    tags: ['WWII', 'Raids'],
    bio: 'Led the Doolittle Raid — the first air strike on the Japanese homeland in WWII. Pioneered instrument flying and set numerous speed records.',
    quote: 'There is nothing stronger in the world than a heart of a warrior.',
    image: '/pilots/Jimmy_Doolittle.jpg',
  },
  {
    id: 'lindbergh',
    name: 'Charles Lindbergh',
    years: '1902 – 1974',
    nationality: 'American',
    tags: ['Firsts', 'Solo'],
    bio: 'First to fly solo nonstop across the Atlantic in 1927. His Spirit of St. Louis flight from New York to Paris took 33.5 hours and changed aviation forever.',
    image: '/pilots/Charles_Lindbergh.jpg',
  },
  {
    id: 'collins',
    name: 'Eileen Collins',
    callsign: 'The First Lady',
    years: '1956 –',
    nationality: 'American',
    tags: ['Astronaut', 'Firsts'],
    bio: 'First female Space Shuttle pilot and commander. Flew four missions and became a symbol of women in aerospace and aviation.',
    quote: 'I believe that the first few women in these positions had to be twice as good as the men.',
    image: '/pilots/Eileen_Collins.jpg',
  },
]
