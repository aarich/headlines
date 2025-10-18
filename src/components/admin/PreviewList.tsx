import PreviewListItem from 'components/admin/PreviewListItem';
import Loading from 'components/common/Loading';
import { useToast } from 'contexts/ToastContext';
import {
  EditablePreviewHeadlineFields,
  fetchPreviewHeadlines,
  publishPreviewHeadline,
  updatePreviewHeadline,
} from 'lib/api';
import { shuffleArray } from 'lib/ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PreviewHeadline, PreviewHeadlineStatus } from 'types';

interface PreviewListProps {
  revealWords: boolean;
  onEditRequest: (preview: PreviewHeadline) => void;
}

const PreviewList: React.FC<PreviewListProps> = ({ revealWords, onEditRequest }) => {
  const [previews, setPreviews] = useState<PreviewHeadline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  const loadPreviews = useCallback(async (showLoading = true) => {
    setIsLoading(showLoading);
    setError(undefined);
    try {
      const data = await fetchPreviewHeadlines();
      setPreviews(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load previews.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  const sortedPreviews = useMemo(() => {
    return [...previews]
      .sort((a, b) => {
        if (a.status === 'rejected' && b.status !== 'rejected') {
          return 1; // a comes after b
        }
        if (a.status !== 'rejected' && b.status === 'rejected') {
          return -1; // a comes before b
        }
        return 0;
      })
      .map(preview => {
        const { articleUrl: url, possibleAnswers, correctAnswer } = preview;
        const articleSite = url.split('/')[2];
        const choices = [...possibleAnswers, correctAnswer];
        shuffleArray(choices);
        return { ...preview, articleSite, choices };
      });
  }, [previews]);

  const filteredPreviews = useMemo(
    () =>
      sortedPreviews.filter(preview =>
        preview.headline.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [sortedPreviews, searchTerm]
  );

  const handleSetStatus = async (preview: PreviewHeadline, status: PreviewHeadlineStatus) => {
    const newStatus = preview.status === status ? null : status;
    const { id } = preview;
    const payload: EditablePreviewHeadlineFields = { ...preview, status: newStatus };

    try {
      const result = await updatePreviewHeadline(id, payload);
      toast(result.message || 'Status updated!', 'success');
      await loadPreviews(false);
    } catch (err: any) {
      toast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handlePublish = async (id: number) => {
    const headlineToPublish = previews.find(preview => preview.id === id)?.headline;
    if (window.confirm(`PUBLISH preview?\n\n${headlineToPublish}`)) {
      try {
        setIsLoading(true);
        const result = await publishPreviewHeadline({ previewId: id });
        toast(result.message || 'Published!', 'success');
        await loadPreviews();
      } catch (err: any) {
        toast(err.message || 'Failed to publish.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="w-full p-2 text-sm border rounded border-neutral-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={searchTerm}
          onTouchCancel={() => setSearchTerm('')}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      {isLoading && <Loading />}
      {error && (
        <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-2 rounded">
          {error}
        </p>
      )}
      {!isLoading && !error && (
        <>
          {previews.length === 0 && <p>No preview headlines found.</p>}
          {previews.length > 0 && filteredPreviews.length === 0 && (
            <p>No headlines match your search.</p>
          )}
          {
            <ul className="space-y-3 pr-2">
              {filteredPreviews.map(preview => (
                <PreviewListItem
                  key={`${preview.id}-${preview.status}`}
                  preview={preview}
                  revealWords={revealWords}
                  onEdit={() => onEditRequest(preview)}
                  onSetStatus={handleSetStatus}
                  onPublish={handlePublish}
                />
              ))}
            </ul>
          }
        </>
      )}
    </>
  );
};

export default PreviewList;
