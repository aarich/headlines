import React, { useMemo } from 'react';
import { shuffleArray } from 'lib/ui';
import { PreviewHeadline, PreviewHeadlineStatus } from 'types';
import PreviewHeadlineItem from 'components/admin/PreviewHeadlineItem';
import Loading from 'components/common/Loading';

interface PreviewListProps {
  previews: PreviewHeadline[];
  revealWords: boolean;
  error: string | undefined;
  isLoading: boolean;
  handleEdit: (preview: PreviewHeadline) => void;
  handleSetStatus: (preview: PreviewHeadline, status: PreviewHeadlineStatus) => void;
  handlePublish: (id: number) => void;
}

const PreviewList: React.FC<PreviewListProps> = ({
  isLoading,
  error,
  previews,
  revealWords,
  handleEdit,
  handleSetStatus,
  handlePublish,
}) => {
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

  return (
    <>
      {isLoading && <Loading />}
      {error && (
        <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-2 rounded">
          {error}
        </p>
      )}
      {!isLoading && !error && previews.length === 0 && <p>No preview headlines found.</p>}
      {!isLoading && previews.length > 0 && (
        <ul className="space-y-3 pr-2 max-h-[50vh] overflow-y-auto">
          {sortedPreviews.map(preview => (
            <PreviewHeadlineItem
              key={preview.id}
              preview={preview}
              revealWords={revealWords}
              isLoading={isLoading}
              onEdit={handleEdit}
              onSetStatus={handleSetStatus}
              onPublish={handlePublish}
            />
          ))}
        </ul>
      )}
    </>
  );
};

export default PreviewList;
