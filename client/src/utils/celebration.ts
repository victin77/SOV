import confetti from 'canvas-confetti';

export function celebrateDealWon() {
  confetti({
    particleCount: 140,
    spread: 90,
    origin: { y: 0.62 },
    colors: ['#4f46e5', '#22c55e', '#f59e0b', '#06b6d4'],
  });

  setTimeout(() => {
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 60,
      origin: { x: 0.15, y: 0.75 },
      colors: ['#4f46e5', '#22c55e', '#f59e0b'],
    });
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 60,
      origin: { x: 0.85, y: 0.75 },
      colors: ['#4f46e5', '#22c55e', '#06b6d4'],
    });
  }, 160);
}
