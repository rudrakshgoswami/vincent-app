/*
 * Shown when a page could not load its data.
 *
 * Every data-loading page in this app used to swallow fetch failures into
 * console.error and then fall through to its empty state, so a server that
 * was down looked exactly like a catalogue with nothing in it -- the venue
 * list said "No venues found. Try adjusting your filters", which blames the
 * visitor's filters for an outage, and the account pages said the user had
 * no orders. Both are worse than an error, because they are believable.
 *
 * An empty state means "we looked, there is nothing". This means "we could
 * not look". Keep them separate.
 */
const LoadError = ({ what = 'this page', onRetry, compact = false }) => {
    if (compact) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
                <p className="text-red-800">
                    Couldn't load {what}.{' '}
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="underline font-medium hover:no-underline"
                        >
                            Try again
                        </button>
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-heading text-secondary mb-2">
                Couldn't load {what}
            </h3>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
                The server didn't answer. This one is on our side, not
                anything you did &mdash; nothing of yours has been lost.
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                    Try again
                </button>
            )}
        </div>
    );
};

export default LoadError;
