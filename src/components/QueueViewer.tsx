import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, X, RotateCcw } from 'lucide-react';
import type { ScanQueueItem } from '../types/contact';
import { formatBytes } from '../services/imageProcessor';

interface QueueViewerProps {
  queue: ScanQueueItem[];
  onRemoveItem: (id: string) => void;
  onRetryItem?: (item: ScanQueueItem) => void;
  onClearCompleted: () => void;
}

export const QueueViewer: React.FC<QueueViewerProps> = ({
  queue,
  onRemoveItem,
  onRetryItem,
  onClearCompleted,
}) => {
  if (queue.length === 0) return null;

  const completedCount = queue.filter((i) => i.status === 'extracted').length;
  const isAllDone = queue.every((i) => i.status === 'extracted' || i.status === 'error');

  return (
    <section className="queue-container">
      <div className="queue-header">
        <h3>
          <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
          Processing Queue ({completedCount}/{queue.length} ready)
        </h3>

        {isAllDone && (
          <button
            onClick={onClearCompleted}
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Clear Finished
          </button>
        )}
      </div>

      <div className="queue-list">
        {queue.map((item) => {
          const reduction =
            item.fileSizeCompressed && item.fileSizeOriginal
              ? Math.max(0, Math.round((1 - item.fileSizeCompressed / item.fileSizeOriginal) * 100))
              : null;

          return (
            <div key={item.id} className="queue-item">
              <div className="queue-item-left">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.fileName}
                    className="queue-item-thumb"
                  />
                ) : (
                  <div className="queue-item-thumb" />
                )}

                <div className="queue-item-details">
                  <div className="queue-item-name" title={item.fileName}>
                    {item.fileName}
                  </div>
                  <div className="queue-item-sub">
                    {formatBytes(item.fileSizeOriginal)}
                    {item.fileSizeCompressed ? (
                      <span>
                        {' '}
                        &rarr; {formatBytes(item.fileSizeCompressed)}{' '}
                        {reduction !== null && (
                          <strong style={{ color: 'var(--accent-emerald)' }}>
                            ({reduction}% saved)
                          </strong>
                        )}
                      </span>
                    ) : null}
                    {item.cardsFound !== undefined && item.status === 'extracted' && (
                      <span> &bull; {item.cardsFound} card{item.cardsFound === 1 ? '' : 's'} isolated</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {item.status === 'compressing' && (
                  <span className="queue-status-tag compressing">
                    <Loader2 size={12} className="animate-spin" />
                    Compressing...
                  </span>
                )}

                {item.status === 'analyzing' && (
                  <span className="queue-status-tag analyzing">
                    <Loader2 size={12} className="animate-spin" />
                    Vision AI Analyzing...
                  </span>
                )}

                {item.status === 'extracted' && (
                  <span className="queue-status-tag extracted">
                    <CheckCircle2 size={12} />
                    Extracted
                  </span>
                )}

                {item.status === 'error' && (
                  <span
                    className="queue-status-tag error"
                    title={item.error || 'Extraction error'}
                  >
                    <AlertCircle size={12} />
                    Error
                  </span>
                )}

                {item.status === 'error' && onRetryItem && (
                  <button
                    onClick={() => onRetryItem(item)}
                    className="icon-btn"
                    style={{ width: 28, height: 28 }}
                    title="Retry item"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="icon-btn"
                  style={{ width: 28, height: 28 }}
                  title="Remove from queue"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
