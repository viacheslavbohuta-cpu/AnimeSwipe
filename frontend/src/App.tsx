import { useEffect, useRef, useState } from 'react';
import Auth from './components/Auth';
import SwipeCard, {
  type Anime,
  type SwipeAction
} from './components/SwipeCard';

import './App.css';
const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface AnimeResponse {
  media: Anime[];
  pageInfo: {
    currentPage: number;
    hasNextPage: boolean;
  };
}

interface LibraryAnime {
  id: number;
  anilist_id: number;
  title_english: string | null;
  title_romaji: string;
  title_native: string | null;
  poster_url: string | null;
  episodes: number | null;
  genres: string[];
  average_score: number | null;
  season_year: number | null;
  format: string | null;
  status: string;
  user_rating: number | null;
  watched_episodes: number;
  updated_at: string;
}

function App() {
    const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('access_token')
  );

  function handleLogin(newToken: string) {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    setToken(null);
  }
  const [libraryAnime, setLibraryAnime] = useState<LibraryAnime[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Discover');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratingAnime, setRatingAnime] = useState<Anime | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [savingSwipe, setSavingSwipe] = useState(false);
  const [swipeError, setSwipeError] = useState('');

  const [editingLibraryAnime, setEditingLibraryAnime] =
    useState<LibraryAnime | null>(null);
  const [librarySelectedRating, setLibrarySelectedRating] = useState(0);
  const [libraryActionLoading, setLibraryActionLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // Search state
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchRatingAnime, setSearchRatingAnime] = useState<Anime | null>(null);
  const [searchSelectedRating, setSearchSelectedRating] = useState(0);
  const [searchActionLoadingId, setSearchActionLoadingId] = useState<number | null>(null);
  const [searchSuccess, setSearchSuccess] = useState('');
  const [libraryStatuses, setLibraryStatuses] = useState<Map<number, string>>(new Map());

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const seenIdsRef = useRef(new Set<number>());
  const pageRef = useRef(1);
  const hasNextRef = useRef(true);
  const queryRef = useRef('');
  const requestVersionRef = useRef(0);

  async function loadAnime(
    query = '',
    requestedPage = 1,
    reset = true
  ) {
    if (loadingRef.current && !reset) return;

    if (reset) {
      requestVersionRef.current += 1;
      setCurrentIndex(0);
      setRatingAnime(null);
      setSelectedRating(0);

      loadingRef.current = false;
      seenIdsRef.current.clear();

      pageRef.current = 1;
      hasNextRef.current = true;
      queryRef.current = query;

      setAnime([]);
      setLoading(true);
      setLoadingMore(false);
      setHasNextPage(true);
      setError('');
      setCatalogQuery(query);
    } else {
      setLoadingMore(true);
    }

    loadingRef.current = true;

    const currentVersion = requestVersionRef.current;

    try {
      const endpoint = query
        ? `${API_URL}/api/anime/search?q=${encodeURIComponent(query)}&page=${requestedPage}`
        : `${API_URL}/api/anime/discover?page=${requestedPage}`;

      const token = localStorage.getItem('access_token');

      const response = await fetch(endpoint, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {}
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;

        try {
          const errorData = await response.json();

          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // Keep the default error message.
        }

        if (response.status === 401) {
          errorMessage =
            'Your session has expired or you are not logged in. Please log in again.';
        }

        throw new Error(errorMessage);
      }

      const data: AnimeResponse = await response.json();

      if (currentVersion !== requestVersionRef.current) return;

      const uniqueAnime = data.media.filter((item) => {
        if (seenIdsRef.current.has(item.id)) {
          return false;
        }

        seenIdsRef.current.add(item.id);
        return true;
      });

      if (reset) {
        setAnime(uniqueAnime);
      } else {
        setAnime((previous) => [
          ...previous,
          ...uniqueAnime
        ]);
      }

      pageRef.current = requestedPage;

      hasNextRef.current = data.pageInfo.hasNextPage;
      setHasNextPage(data.pageInfo.hasNextPage);

    } catch (err) {
      if (currentVersion !== requestVersionRef.current) return;

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong'
      );
    } finally {
      if (currentVersion === requestVersionRef.current) {
        loadingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function loadLibrary(
    status: 'WATCHED' | 'WANT_TO_WATCH'
  ) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLibraryError('Please log in first.');
      return;
    }

    setLibraryLoading(true);
    setLibraryError('');

    try {
      const response = await fetch(
        `${API_URL}/api/library?status=${status}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not load library');
      }

      setLibraryAnime(data);

    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : 'Something went wrong'
      );
    } finally {
      setLibraryLoading(false);
    }
  }

  async function loadFavoriteIds() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/favorites`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setFavoriteIds(
        new Set(
          data.map((item: { anilist_id: number }) => item.anilist_id)
        )
      );
    } catch {
      // Favorites can be loaded again when the user opens the tab.
    }
  }

  async function loadFavorites() {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLibraryError('Please log in first.');
      return;
    }

    setLibraryLoading(true);
    setLibraryError('');

    try {
      const response = await fetch(
        `${API_URL}/api/favorites`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not load favorites');
      }

      const favorites: LibraryAnime[] = data.map((item: any) => ({
        ...item,
        status: 'FAVORITE',
        user_rating: null,
        watched_episodes: 0,
        updated_at: item.created_at
      }));

      setLibraryAnime(favorites);

      setFavoriteIds(
        new Set(favorites.map((item) => item.anilist_id))
      );

    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : 'Something went wrong'
      );
    } finally {
      setLibraryLoading(false);
    }
  }

  async function searchCatalog(query: string) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearchError('Enter an anime title to search.');
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      setSearchError('Please log in first.');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setSearchSuccess('');
    setSearchResults([]);

    try {
      const response = await fetch(
        `${API_URL}/api/anime/search?q=${encodeURIComponent(trimmedQuery)}&page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

if (!response.ok) {
  throw new Error(data.detail || 'Search failed');
}

      if (!response.ok) {
        throw new Error(data.detail || 'Could not search anime');
      }

      setSearchResults(data.media);

      const [watchedResponse, watchlistResponse] = await Promise.all([
        fetch(`${API_URL}/api/library?status=WATCHED`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/library?status=WANT_TO_WATCH`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (watchedResponse.ok && watchlistResponse.ok) {
        const watched: LibraryAnime[] = await watchedResponse.json();
        const watchlist: LibraryAnime[] = await watchlistResponse.json();
        const statuses = new Map<number, string>();

        watched.forEach((item) => statuses.set(item.anilist_id, 'WATCHED'));
        watchlist.forEach((item) => statuses.set(item.anilist_id, 'WANT_TO_WATCH'));

        setLibraryStatuses(statuses);
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setSearchLoading(false);
    }
  }

  async function addSearchAnimeToWatchlist(item: Anime) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setSearchError('Please log in first.');
      return;
    }

    setSearchActionLoadingId(item.id);
    setSearchError('');
    setSearchSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/swipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          anilist_id: item.id,
          action: 'WANT_TO_WATCH'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not add anime');

      setLibraryStatuses((previous) => {
        const next = new Map(previous);
        next.set(item.id, 'WANT_TO_WATCH');
        return next;
      });

      setSearchSuccess(`${item.title.english || item.title.romaji} added to your Watchlist.`);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSearchActionLoadingId(null);
    }
  }

  async function submitSearchRating() {
    if (!searchRatingAnime || searchSelectedRating === 0) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      setSearchError('Please log in first.');
      return;
    }

    const item = searchRatingAnime;
    setSearchActionLoadingId(item.id);
    setSearchError('');
    setSearchSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/swipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          anilist_id: item.id,
          action: 'WATCHED',
          rating: searchSelectedRating
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not mark anime as watched');

      setLibraryStatuses((previous) => {
        const next = new Map(previous);
        next.set(item.id, 'WATCHED');
        return next;
      });

      setSearchSuccess(`${item.title.english || item.title.romaji} added to My Library.`);
      setSearchRatingAnime(null);
      setSearchSelectedRating(0);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSearchActionLoadingId(null);
    }
  }

  async function toggleSearchFavorite(item: Anime) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setSearchError('Please log in first.');
      return;
    }

    const isFavorite = favoriteIds.has(item.id);
    setSearchActionLoadingId(item.id);
    setSearchError('');
    setSearchSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/api/favorites/${item.id}`,
        {
          method: isFavorite ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not update favorites');

      setFavoriteIds((previous) => {
        const next = new Set(previous);
        if (isFavorite) next.delete(item.id);
        else next.add(item.id);
        return next;
      });

      setSearchSuccess(
        isFavorite
          ? `${item.title.english || item.title.romaji} removed from Favorites.`
          : `${item.title.english || item.title.romaji} added to Favorites.`
      );
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSearchActionLoadingId(null);
    }
  }

  async function toggleFavorite(item: LibraryAnime) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLibraryError('Please log in first.');
      return;
    }

    const isFavorite = favoriteIds.has(item.anilist_id);

    setLibraryActionLoading(true);
    setLibraryError('');

    try {
      const response = await fetch(
        `${API_URL}/api/favorites/${item.anilist_id}`,
        {
          method: isFavorite ? 'DELETE' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not update favorites');
      }

      setFavoriteIds((previous) => {
        const next = new Set(previous);

        if (isFavorite) {
          next.delete(item.anilist_id);
        } else {
          next.add(item.anilist_id);
        }

        return next;
      });

      if (activeTab === 'Favorites') {
        await loadFavorites();
      }

    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : 'Something went wrong'
      );
    } finally {
      setLibraryActionLoading(false);
    }
  }
    async function updateLibraryAnime(
    item: LibraryAnime,
    status: 'WATCHED' | 'WANT_TO_WATCH',
    rating?: number
  ) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLibraryError('Please log in first.');
      return;
    }

    setLibraryActionLoading(true);
    setLibraryError('');

    try {
      const response = await fetch(
        `${API_URL}/api/library/${item.anilist_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            ...(rating !== undefined ? { rating } : {})
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not update anime');
      }

      setEditingLibraryAnime(null);
      setLibrarySelectedRating(0);

      await loadLibrary(
        activeTab === 'Watchlist' ? 'WANT_TO_WATCH' : 'WATCHED'
      );

    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : 'Something went wrong'
      );
    } finally {
      setLibraryActionLoading(false);
    }
  }

  async function removeLibraryAnime(item: LibraryAnime) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLibraryError('Please log in first.');
      return;
    }

    const confirmed = window.confirm(
      `Remove ${item.title_english || item.title_romaji} from your collection?`
    );

    if (!confirmed) return;

    setLibraryActionLoading(true);
    setLibraryError('');

    try {
      const response = await fetch(
        `${API_URL}/api/library/${item.anilist_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not remove anime');
      }

      await loadLibrary(
        activeTab === 'Watchlist' ? 'WANT_TO_WATCH' : 'WATCHED'
      );

    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : 'Something went wrong'
      );
    } finally {
      setLibraryActionLoading(false);
    }
  }

  useEffect(() => {
    loadAnime('', 1, true);
    loadFavoriteIds();
  }, []);

  useEffect(() => {
    if (activeTab === 'My Library') {
      loadLibrary('WATCHED');
    }

    if (activeTab === 'Watchlist') {
      loadLibrary('WANT_TO_WATCH');
    }

    if (activeTab === 'Favorites') {
      loadFavorites();
    }
  }, [activeTab]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          entry.isIntersecting &&
          !loadingRef.current &&
          hasNextRef.current
        ) {
          loadAnime(
            queryRef.current,
            pageRef.current + 1,
            false
          );
        }
      },
      {
        root: null,
        rootMargin: '800px',
        threshold: 0
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const remainingAnime = anime.length - currentIndex;

    if (
      activeTab !== 'Discover' ||
      loading ||
      loadingMore ||
      !hasNextPage ||
      remainingAnime > 5
    ) {
      return;
    }

    loadAnime(
      queryRef.current,
      pageRef.current + 1,
      false
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    anime.length,
    currentIndex,
    loading,
    loadingMore,
    hasNextPage,
    activeTab
  ]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveTab('Search');
    searchCatalog(search);
  }

  async function saveSwipe(
    currentAnime: Anime,
    action: SwipeAction,
    rating?: number
  ) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setSwipeError('Please log in first.');
      return false;
    }

    const backendAction =
      action === 'SKIP' ? 'NOT_WATCHED' : action;

    setSavingSwipe(true);
    setSwipeError('');

    try {
      const response = await fetch(
        `${API_URL}/api/library?status=${status}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            anilist_id: currentAnime.id,
            action: backendAction,
            ...(rating !== undefined ? { rating } : {})
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not save swipe');
      }

      return true;

    } catch (error) {
      setSwipeError(
        error instanceof Error
          ? error.message
          : 'Something went wrong'
      );

      return false;

    } finally {
      setSavingSwipe(false);
    }
  }

  async function handleSwipe(action: SwipeAction) {
    const currentAnime = anime[currentIndex];

    if (!currentAnime || savingSwipe) return;

    if (action === 'WATCHED') {
      setRatingAnime(currentAnime);
      setSelectedRating(0);
      setSwipeError('');
      return;
    }

    const saved = await saveSwipe(currentAnime, action);

    if (saved) {
      setCurrentIndex((previous) => previous + 1);
    }
  }

  async function submitRating() {
    if (!ratingAnime || selectedRating === 0 || savingSwipe) return;

    const saved = await saveSwipe(
      ratingAnime,
      'WATCHED',
      selectedRating
    );

    if (saved) {
      setRatingAnime(null);
      setSelectedRating(0);
      setCurrentIndex((previous) => previous + 1);
    }
  }

    if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">A</span>
          <span>
            Anime<span className="purple">Swipe</span>
          </span>
        </div>

        <div className="nav-section">
          <p className="nav-label">MENU</p>

          {['Discover', 'Search', 'My Library', 'Watchlist', 'Favorites'].map(
            (item) => (
              <button
                key={item}
                className={`nav-item ${activeTab === item ? 'active' : ''}`}
                onClick={() => setActiveTab(item)}
              >
                <span>
                  {item === 'Discover' ? '◈' :
                   item === 'Search' ? '⌕' :
                   item === 'My Library' ? '▤' :
                   item === 'Watchlist' ? '◷' : '♡'}
                </span>
                {item}
              </button>
            )
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">A</div>
            <div>
              <strong>Anime Fan</strong>
              <p>Your anime journey</p>
            </div>
          </div>
        </div>
      </aside>
      <button className="logout-button" onClick={handleLogout}>
  Log out
</button>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR ANIME UNIVERSE</p>
            <h1>Discover Anime</h1>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anime..."
            />
            <button type="submit">Search</button>
          </form>
        </header>

        <section className="hero">
          <div className="hero-content">
            <span className="hero-tag">✦ YOUR NEXT FAVORITE</span>
            <h2>
              Find your next<br />anime obsession.
            </h2>

            <p>
              Explore thousands of anime, discover hidden gems
              and build your personal collection.
            </p>

            <button
              className="hero-button"
              onClick={() =>
                document.getElementById('catalog')?.scrollIntoView({
                  behavior: 'smooth'
                })
              }
            >
              Explore collection →
            </button>
          </div>

          <div className="hero-decoration">アニメ</div>
        </section>

        <section
          className="catalog"
          id="catalog"
          style={{
            display: activeTab === 'Discover' ? 'block' : 'none'
          }}
        >
          <div className="section-header">
            <div>
              <p className="eyebrow">EXPLORE THE CATALOG</p>
              <h2>
                {catalogQuery
                  ? `Results for "${catalogQuery}"`
                  : 'Discover Anime'}
              </h2>
            </div>

            <span className="result-count">
              {anime.length} titles
            </span>
          </div>

          {loading && (
            <div className="message">Loading anime catalog...</div>
          )}

          {error && (
            <div className="message error">
              {error}
              <button onClick={() => loadAnime(search.trim(), 1, true)}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && anime.length === 0 && (
            <div className="message">No anime found.</div>
          )}

          {!loading &&
            !error &&
            anime.length > 0 &&
            currentIndex < anime.length && (
              <SwipeCard
                anime={anime[currentIndex]}
                onSwipe={handleSwipe}
                disabled={savingSwipe || ratingAnime !== null}
              />
            )}

          {!loading &&
            !error &&
            currentIndex >= anime.length && (
              <div className="message">
                {loadingMore
                  ? 'Loading more anime...'
                  : hasNextPage
                    ? 'Loading next anime...'
                    : "You've reached the end of the catalog."}
              </div>
            )}

          {swipeError && (
            <div className="message error">
              {swipeError}
            </div>
          )}

          {ratingAnime && (
            <div className="rating-modal-backdrop">
              <div className="rating-modal">
                <h2>Rate this anime</h2>

                <p>
                  {ratingAnime.title.english ||
                    ratingAnime.title.romaji}
                </p>

                <p className="rating-description">
                  How much did you enjoy it?
                </p>

                <div className="rating-options">
                  {Array.from(
                    { length: 10 },
                    (_, index) => index + 1
                  ).map((rating) => (
                    <button
                      key={rating}
                      className={
                        selectedRating === rating ? 'selected' : ''
                      }
                      onClick={() => setSelectedRating(rating)}
                    >
                      {rating}
                    </button>
                  ))}
                </div>

                <button
                  className="rating-submit"
                  disabled={selectedRating === 0 || savingSwipe}
                  onClick={submitRating}
                >
                  {savingSwipe ? 'Saving...' : 'Save rating'}
                </button>
              </div>
            </div>
          )}

          <div ref={sentinelRef} className="scroll-sentinel" />

          {loadingMore && (
            <div className="message">
              Loading more anime...
            </div>
          )}

          {!hasNextPage && anime.length > 0 && (
            <div className="message">
              You've reached the end of the catalog.
            </div>
          )}
        </section>

        {activeTab === 'Search' && (
          <section className="catalog library-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">ANILIST CATALOG</p>
                <h2>Search Anime</h2>
              </div>
              <span className="result-count">{searchResults.length} titles</span>
            </div>

            {searchLoading && <div className="message">Searching AniList...</div>}
            {searchError && <div className="message error">{searchError}</div>}
            {searchSuccess && <div className="message">{searchSuccess}</div>}

            {!searchLoading && !searchError && searchResults.length === 0 && (
              <div className="message">
                Search for an anime using the search bar above.
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="library-grid">
                {searchResults.map((item) => {
                  const status = libraryStatuses.get(item.id);
                  const isFavorite = favoriteIds.has(item.id);
                  const actionLoading = searchActionLoadingId === item.id;

                  return (
                    <article className="library-card" key={item.id}>
                      <img
                        src={item.coverImage?.extraLarge || item.coverImage?.large || ''}
                        alt={item.title.english || item.title.romaji}
                      />
                      <div className="library-card-info">
                        <h3>{item.title.english || item.title.romaji}</h3>
                        <p>
                          {item.seasonYear || 'Unknown year'} · {item.format || 'Anime'} · {item.episodes ?? '?'} episodes
                        </p>
                        <p>
                          AniList score: {item.averageScore ? `${item.averageScore}/100` : 'Not rated'}
                        </p>
                        {status && (
                          <div className={status === 'WATCHED' ? 'library-rating' : 'library-watchlist'}>
                            {status === 'WATCHED' ? 'Already in My Library' : 'Already in Watchlist'}
                          </div>
                        )}
                        <div className="library-card-actions">
                          <button
                            onClick={() => addSearchAnimeToWatchlist(item)}
                            disabled={actionLoading || status === 'WANT_TO_WATCH'}
                          >
                            {actionLoading ? 'Saving...' : status === 'WANT_TO_WATCH' ? 'In Watchlist' : 'Add to Watchlist'}
                          </button>
                          <button
                            onClick={() => {
                              setSearchRatingAnime(item);
                              setSearchSelectedRating(0);
                            }}
                            disabled={actionLoading || status === 'WATCHED'}
                          >
                            {status === 'WATCHED' ? 'Already Watched' : 'Mark as Watched'}
                          </button>
                          <button
                            className="favorite-toggle"
                            onClick={() => toggleSearchFavorite(item)}
                            disabled={actionLoading}
                          >
                            {isFavorite ? '♥ Remove favorite' : '♡ Add to Favorites'}
                          </button>
                          {item.siteUrl && (
                            <a href={item.siteUrl} target="_blank" rel="noreferrer">
                              View on AniList ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {searchRatingAnime && (
              <div className="rating-modal-backdrop">
                <div className="rating-modal">
                  <h2>Rate this anime</h2>
                  <p>{searchRatingAnime.title.english || searchRatingAnime.title.romaji}</p>
                  <p className="rating-description">Select your rating from 1 to 10</p>
                  <div className="rating-options">
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                      <button
                        key={rating}
                        className={searchSelectedRating === rating ? 'selected' : ''}
                        onClick={() => setSearchSelectedRating(rating)}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <button
                    className="rating-submit"
                    disabled={searchSelectedRating === 0 || searchActionLoadingId !== null}
                    onClick={submitSearchRating}
                  >
                    {searchActionLoadingId === searchRatingAnime.id ? 'Saving...' : 'Save rating'}
                  </button>
                  <button
                    className="rating-cancel"
                    onClick={() => {
                      setSearchRatingAnime(null);
                      setSearchSelectedRating(0);
                    }}
                    disabled={searchActionLoadingId !== null}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab !== 'Discover' && activeTab !== 'Search' && (
          <section className="catalog library-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">YOUR COLLECTION</p>
                <h2>{activeTab}</h2>
              </div>

              <span className="result-count">
                {libraryAnime.length} titles
              </span>
            </div>

            {libraryLoading && (
              <div className="message">
                Loading your collection...
              </div>
            )}

            {libraryError && (
              <div className="message error">
                {libraryError}
              </div>
            )}

            {!libraryLoading &&
              !libraryError &&
              libraryAnime.length === 0 && (
                <div className="message">
                  No anime here yet. Start swiping in Discover!
                </div>
              )}

            {!libraryLoading && libraryAnime.length > 0 && (
              <div className="library-grid">
                {libraryAnime.map((item) => (
                  <article className="library-card" key={item.id}>
                    <img
                      src={item.poster_url || ''}
                      alt={item.title_english || item.title_romaji}
                    />

                    <div className="library-card-info">
                      <h3>
                        {item.title_english || item.title_romaji}
                      </h3>

                      <p>
                        {item.season_year || 'Unknown year'} ·{' '}
                        {item.format || 'Anime'} ·{' '}
                        {item.episodes ?? '?'} episodes
                      </p>

                      {item.status === 'WATCHED' && (
                        <div className="library-rating">
                          Your rating: {item.user_rating ?? 'Not rated'}/10
                        </div>
                      )}

                      {item.status === 'WANT_TO_WATCH' && (
                        <div className="library-watchlist">
                          Want to watch
                        </div>
                      )}

                      <div className="library-card-actions">
                        <button
                          className="favorite-toggle"
                          onClick={() => toggleFavorite(item)}
                          disabled={libraryActionLoading}
                        >
                          {favoriteIds.has(item.anilist_id)
                            ? '♥ Remove favorite'
                            : '♡ Add to Favorites'}
                        </button>

                        {activeTab !== 'Favorites' &&
                        item.status === 'WATCHED' ? (
                          <button
                            onClick={() => {
                              setEditingLibraryAnime(item);
                              setLibrarySelectedRating(
                                item.user_rating ?? 0
                              );
                            }}
                            disabled={libraryActionLoading}
                          >
                            Edit rating
                          </button>
                        ) : activeTab !== 'Favorites' ? (
                          <button
                            onClick={() => {
                              setEditingLibraryAnime(item);
                              setLibrarySelectedRating(0);
                            }}
                            disabled={libraryActionLoading}
                          >
                            Move to Watched
                          </button>
                        ) : null}

                        {activeTab !== 'Favorites' && (
                          <button
                            className="remove-button"
                            onClick={() => removeLibraryAnime(item)}
                            disabled={libraryActionLoading}
                          >
                            Remove from collection
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {editingLibraryAnime && activeTab !== 'Favorites' && (
              <div className="rating-modal-backdrop">
                <div className="rating-modal">
                  <h2>
                    {editingLibraryAnime.status === 'WATCHED'
                      ? 'Edit your rating'
                      : 'Move to Watched'}
                  </h2>

                  <p>
                    {editingLibraryAnime.title_english ||
                      editingLibraryAnime.title_romaji}
                  </p>

                  <p className="rating-description">
                    Select your rating from 1 to 10
                  </p>

                  <div className="rating-options">
                    {Array.from(
                      { length: 10 },
                      (_, index) => index + 1
                    ).map((rating) => (
                      <button
                        key={rating}
                        className={
                          librarySelectedRating === rating
                            ? 'selected'
                            : ''
                        }
                        onClick={() => setLibrarySelectedRating(rating)}
                        disabled={libraryActionLoading}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>

                  <button
                    className="rating-submit"
                    disabled={
                      librarySelectedRating === 0 ||
                      libraryActionLoading
                    }
                    onClick={() =>
                      updateLibraryAnime(
                        editingLibraryAnime,
                        'WATCHED',
                        librarySelectedRating
                      )
                    }
                  >
                    {libraryActionLoading ? 'Saving...' : 'Save'}
                  </button>

                  <button
                    className="rating-cancel"
                    onClick={() => {
                      setEditingLibraryAnime(null);
                      setLibrarySelectedRating(0);
                    }}
                    disabled={libraryActionLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;