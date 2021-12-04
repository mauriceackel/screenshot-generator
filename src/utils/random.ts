import { shuffle } from './shuffle';

export function getRandomElement<T>(array: Array<T>): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

export function getRandomElements<T>(array: Array<T>, amount: number): T[] {
  const result: T[] = [];
  let remainingCount = amount;
  const elements = [...array];

  while (remainingCount > 0) {
    shuffle(elements);
    // Try to get all the remaining elements if possible
    const extracted = elements.slice(0, remainingCount);
    result.push(...extracted);
    remainingCount -= extracted.length;
  }

  return result;
}

export function trueWithProbability(probability: number) {
  if (probability >= 1) return true;

  return Math.random() < probability;
}

export function randomMax(max: number): number {
  return Math.random() * max;
}

export function randomBetween(min: number, max: number): number {
  return min + randomMax(max - min);
}

export function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomBetween(min, max));
}
