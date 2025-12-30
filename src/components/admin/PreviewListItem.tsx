import {
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { PreviewHeadline, PreviewHeadlineStatus } from 'types';

interface PreviewListItemProps {
  preview: PreviewHeadline & { articleSite: string; choices: string[] };
  revealWords: boolean;
  onEdit: (preview: PreviewHeadline) => void;
  onSetStatus: (preview: PreviewHeadline, status: PreviewHeadlineStatus) => void;
  onPublish: (id: number) => void;
}

const PreviewListItem: React.FC<PreviewListItemProps> = ({
  preview,
  revealWords,
  onEdit,
  onSetStatus,
  onPublish,
}) => {
  const isRejected = preview.status === 'rejected';
  const publishTime = new Date(preview.publishTime.replace(' ', 'T') + 'Z');

  return (
    <li
      className={`p-3 rounded-md shadow-sm flex flex-row items-stretch bg-gray-50 dark:bg-gray-800 ${
        isRejected ? 'opacity-60' : ''
      }`}
    >
      <div className="flex-1">
        <p className={isRejected ? 'text-gray-400 dark:text-gray-500' : ''}>
          {revealWords
            ? preview.headline
            : `${preview.beforeBlank || ''}[???]${preview.afterBlank || ''}`}
        </p>
        <p
          className={`text-xs ${
            isRejected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {preview.choices.join(', ')}
        </p>
        <p
          className={`text-xs italic ${
            isRejected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-600'
          }`}
        >
          {preview.hint}
        </p>
        <p
          className={`text-xs ${isRejected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}
        >
          <a
            href={preview.articleUrl}
            target="_blank"
            className="hover:text-blue-500 dark:hover:text-blue-400"
          >
            {preview.articleSite}
          </a>
          &nbsp;|&nbsp;
          <a
            href={preview.redditUrl}
            target="_blank"
            className="hover:text-blue-500 dark:hover:text-blue-400"
          >
            reddit
          </a>
          &nbsp;|&nbsp;
          {publishTime.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
          })}
        </p>
        <div className="flex flex-row mt-2 gap-1 justify-between">
          <button
            onClick={() => onEdit(preview)}
            className="btn btn-ghost btn-sm text-xs text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400"
            title="Edit"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onPublish(preview.id)}
            className="btn btn-ghost btn-sm text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-300"
            title="Publish"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onSetStatus(preview, 'selected')}
            className={`btn btn-ghost btn-sm text-xs ${preview.status === 'selected' ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400'}`}
            title="Select this preview"
          >
            <CheckCircleIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onSetStatus(preview, 'rejected')}
            className={`btn btn-ghost btn-sm text-xs ${isRejected ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400'}`}
            title={'Reject'}
          >
            <ArchiveBoxXMarkIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onSetStatus(preview, 'archived')}
            className={`btn btn-ghost btn-sm text-xs ${preview.status === 'archived' ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'}`}
            title="Archive"
          >
            <ArchiveBoxIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </li>
  );
};

export default PreviewListItem;
