type DataStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
};

export function DataState({ loading, error, empty, emptyMessage }: DataStateProps) {
  if (loading) {
    return <p className="helper-text">Loading data from the SIBMS API...</p>;
  }

  if (error) {
    return <p className="helper-text error">{error}</p>;
  }

  if (empty) {
    return <p className="helper-text">{emptyMessage ?? "No records available yet."}</p>;
  }

  return null;
}
