import { Game } from './game/Game';

// Start Game application when DOM is ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game().start();
  });
} else {
  new Game().start();
}
