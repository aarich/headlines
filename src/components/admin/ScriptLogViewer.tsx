import React, { useState, useEffect, useCallback } from 'react';
import { ScriptLogEntry, fetchScriptExecutionLogs, deleteScriptExecutionLogs } from 'lib/api';
import Loading from 'components/common/Loading';
import { ArrowUturnLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useToast } from 'contexts/ToastContext';

interface ScriptLogViewerProps {
  onBack: () => void;
}

const getStatusColor = (status: ScriptLogEntry['status']) => {
  switch (status) {
    case 'success':
      return 'text-green-500 dark:text-green-400';
    case 'failed':
      return 'text-red-500 dark:text-red-400';
    case 'completed_early':
      return 'text-yellow-500 dark:text-yellow-400';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
};

const ScriptLogViewer: React.FC<ScriptLogViewerProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<ScriptLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await fetchScriptExecutionLogs(30);
      setLogs(data.logs);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load script logs.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDeleteAllLogs = async () => {
    if (window.confirm('Are you sure you want to delete ALL script execution logs?')) {
      setIsDeleting(true);
      try {
        const result = await deleteScriptExecutionLogs();
        toast(result.message || 'All logs deleted successfully!', 'success');
        setLogs([]);
      } catch (err: any) {
        toast(err.message || 'Failed to delete logs.', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="space-y-4 text-gray-700 dark:text-gray-200">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="btn btn-secondary flex items-center">
          <ArrowUturnLeftIcon className="w-5 h-5 mr-2" />
          Back to Previews
        </button>
        <button
          onClick={handleDeleteAllLogs}
          className="btn btn-danger flex items-center"
          disabled={isDeleting || isLoading || logs.length === 0}
        >
          <TrashIcon className="w-5 h-5 mr-2" />
          {isDeleting ? 'Deleting...' : 'Delete All Logs'}
        </button>
      </div>

      {isLoading && <Loading />}
      {error && (
        <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-2 rounded">
          Error loading logs: {error}
        </p>
      )}
      {!isLoading && !error && logs.length === 0 && <p>No script execution logs found.</p>}

      {!isLoading && !error && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                {['Date', 'Command', 'Env', 'Status'].map(header => (
                  <th
                    key={header}
                    scope="col"
                    className={`px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                      header === 'Command' ? 'w-1/2' : '' // Prioritize width for the Command column header
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {new Date(log.created_date).toLocaleString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs w-1/2">
                      <pre className="whitespace-pre-wrap break-all">{log.command}</pre>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{log.environment}</td>
                    <td
                      className={`px-3 py-2 whitespace-nowrap text-xs font-semibold ${getStatusColor(
                        log.status
                      )}`}
                    >
                      {log.status}
                    </td>
                  </tr>
                  {log.message && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                      >
                        <pre className="whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
                          {log.message}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ScriptLogViewer;
