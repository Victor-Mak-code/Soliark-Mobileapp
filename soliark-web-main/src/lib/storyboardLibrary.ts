export interface StoryboardTemplate {
  id: string;
  title: string;
  sceneCount: number;
  durationSeconds: number;
  tags: string[];
  coverImage: string;
}

export function formatStoryboardDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const STORYBOARD_LIBRARY: StoryboardTemplate[] = [
  {
    id: 'summer-adventures',
    title: 'Summer Adventures',
    sceneCount: 8,
    durationSeconds: 165,
    tags: ['travel', 'adventure'],
    coverImage: '/story-board/summer-adventures.webp',
  },
  {
    id: 'morning-routine',
    title: 'Morning Routine',
    sceneCount: 6,
    durationSeconds: 90,
    tags: ['lifestyle', 'routine'],
    coverImage: '/story-board/morning-routine.webp',
  },
  {
    id: 'city-life',
    title: 'City Life',
    sceneCount: 12,
    durationSeconds: 260,
    tags: ['urban', 'city'],
    coverImage: '/story-board/city-life.webp',
  },
  {
    id: 'nature-meditation',
    title: 'Nature Meditation',
    sceneCount: 6,
    durationSeconds: 195,
    tags: ['nature', 'meditation', 'peaceful'],
    coverImage: '/story-board/nature-meditation.webp',
  },
  {
    id: 'creative-process',
    title: 'Creative Process',
    sceneCount: 10,
    durationSeconds: 225,
    tags: ['creative', 'art', 'process'],
    coverImage: '/story-board/creative-process.webp',
  },
  {
    id: 'family-moments',
    title: 'Family Moments',
    sceneCount: 7,
    durationSeconds: 150,
    tags: ['family', 'moments', 'love'],
    coverImage: '/story-board/family-moments.webp',
  },
];

export function getStoryboardById(id: string): StoryboardTemplate | undefined {
  return STORYBOARD_LIBRARY.find((storyboard) => storyboard.id === id);
}
