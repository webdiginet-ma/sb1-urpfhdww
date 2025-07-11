import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'bg-blue-500',
  height = 'h-2',
  showPercentage = false,
  className = '',
}) => {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-600 mt-1 text-right">
          {normalizedProgress}%
        </div>
      )}
    </div>
  );
};