import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Loading from 'components/common/Loading';
import TickerItem from 'components/TickerItem';
import { useMaybeHeadline } from 'contexts/HeadlineContext';
import { fetchHistory } from 'lib/api';
import { getStoredScores } from 'lib/storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HeadlineHistory } from 'types';

interface HistoryListProps {
  isOpen: boolean;
}

const HistoryList: React.FC<HistoryListProps> = ({ isOpen }) => {
  const headline = useMaybeHeadline();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scores = useMemo(() => getStoredScores(), [isOpen]);
  const [history, setHistory] = useState<Record<number, HeadlineHistory[]>>({});
  const [revealWords, setRevealWords] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver>();

  const lastHistoryElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(prevPage => prevPage + 1);
        }
      });
      if (node) {
        observer.current.observe(node);
      }
    },
    [loading, hasMore]
  );

  useEffect(() => {
    if (!isOpen || !hasMore) return;
    setLoading(true);
    fetchHistory(page)
      .then(newHistoryPage => {
        if (newHistoryPage.headlines.length === 0) {
          setHasMore(false);
        } else {
          setHistory(prev => ({ ...prev, [newHistoryPage.page]: newHistoryPage.headlines }));
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching history:', error);
        setLoading(false);
      });
  }, [page, isOpen, hasMore]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setHistory([]);
      setPage(1);
      setHasMore(true);
    }
  }, [isOpen]);

  const flattenedHistory = useMemo(() => {
    return Object.values(history)
      .flat()
      .sort((a, b) => b.gameNum - a.gameNum);
  }, [history]);

  // Hide the first item answer if the user hasn't completed it yet
  const hideFirstItem = useMemo(
    () => !scores[`${flattenedHistory?.[0]?.id}`],
    [flattenedHistory, scores]
  );

  return (
    <div>
      <h3 className="text-lg font-bold mt-4 flex items-center">
        News Ticker{' '}
        <button className="mx-4" onClick={() => setRevealWords(!revealWords)}>
          {revealWords ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
        </button>
      </h3>
      <p className="text-sm text-gray-500 mb-3">See how everyone's doing on recent headlines:</p>

      {flattenedHistory.map((h, i) => (
        <TickerItem
          ref={i === flattenedHistory.length - 1 ? lastHistoryElementRef : null}
          key={h.id}
          headline={h}
          revealWord={revealWords && !(i === 0 && hideFirstItem)}
          isCurrent={headline?.id === h.id}
          isLatest={i === 0}
          hasCompleted={`${h.id}` in scores}
        />
      ))}
      {loading && <Loading />}
      {!hasMore && <p className="text-center text-gray-500">No more headlines</p>}
    </div>
  );
};

export default HistoryList;
