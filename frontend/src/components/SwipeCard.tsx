
import { useRef, useState } from 'react';

export interface Anime {
  id: number;
  siteUrl?: string;
  title: {
    english: string | null;
    romaji: string;
    native: string | null;
  };
  description: string | null;
  coverImage: {
    large: string | null;
    extraLarge: string | null;
  };
  episodes: number | null;
  genres: string[];
  averageScore: number | null;
  seasonYear: number | null;
  format: string | null;
}

export type SwipeAction =
  | 'WATCHED'
  | 'NOT_INTERESTED'
  | 'WANT_TO_WATCH'
  | 'SKIP';

interface SwipeCardProps {
  anime: Anime;
  onSwipe: (action: SwipeAction) => void;
  disabled?: boolean;
}

function SwipeCard({ anime, onSwipe, disabled = false }: SwipeCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const startPosition = useRef({ x: 0, y: 0 });

  function handlePointerDown(
  event: React.PointerEvent<HTMLDivElement>
) {
  if (disabled) return;

  startPosition.current = {
    x: event.clientX - position.x,
    y: event.clientY - position.y,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
  setDragging(true);
}

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (!dragging || disabled) return;

    setPosition({
      x: event.clientX - startPosition.current.x,
      y: event.clientY - startPosition.current.y,
    });
  }

  function handlePointerUp() {
    if (!dragging || disabled) return;

    setDragging(false);

    const { x, y } = position;
    const threshold = 100;

    if (Math.abs(x) > Math.abs(y) && Math.abs(x) > threshold) {
      onSwipe(x > 0 ? 'WATCHED' : 'NOT_INTERESTED');
      return;
    }

    if (Math.abs(y) > threshold) {
      onSwipe(y < 0 ? 'WANT_TO_WATCH' : 'SKIP');
      return;
    }

    setPosition({ x: 0, y: 0 });
  }

  function handleButton(action: SwipeAction) {
     if (disabled) return;

    onSwipe(action);
  }

  const rotation = position.x * 0.05;

  return (
    <div className="swipe-card-container">

      <article
        className={`swipe-card ${dragging ? 'dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragging(false);
          setPosition({ x: 0, y: 0 });
        }}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
          touchAction: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <img
          className="swipe-card-poster"
          src={
            anime.coverImage.extraLarge ||
            anime.coverImage.large ||
            ''
          }
          alt={anime.title.english || anime.title.romaji}
          draggable={false}
        />

        <div className="swipe-card-overlay">
          <div className="swipe-card-rating">
            ★ {anime.averageScore
              ? (anime.averageScore / 10).toFixed(1)
              : 'N/A'}
          </div>

          <div className="swipe-card-info">
            <h2>
              {anime.title.english || anime.title.romaji}
            </h2>

            <p>
              {anime.seasonYear || 'Unknown year'} ·{' '}
              {anime.format || 'Anime'} ·{' '}
              {anime.episodes ?? '?'} episodes
            </p>

            <div className="swipe-card-genres">
              {anime.genres.slice(0, 4).map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
          </div>
        </div>
      </article>

      <div className="swipe-actions">
        <button
          className="swipe-button reject"
          disabled={disabled}
          onClick={() => handleButton('NOT_INTERESTED')}
          title="Not Interested"
        >
          ✕
        </button>

        <button
          className="swipe-button skip"
          disabled={disabled}
          onClick={() => handleButton('SKIP')}
          title="Skip"
        >
          ↻
        </button>

        <button
          className="swipe-button watchlist"
          disabled={disabled}
          onClick={() => handleButton('WANT_TO_WATCH')}
          title="Watchlist"
        >
          ▣
        </button>

        <button
          className="swipe-button watched"
          disabled={disabled}
          onClick={() => handleButton('WATCHED')}
          title="Watched"
        >
          ♥
        </button>
      </div>

    </div>
  );
}

export default SwipeCard;
