interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="error-screen">
      <h1 className="error-title">エラーが発生しました</h1>
      <p className="error-message">{message}</p>
      <button className="error-retry-button" onClick={onRetry}>
        最初からやり直す
      </button>
    </div>
  );
}
