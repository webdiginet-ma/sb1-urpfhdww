import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number;
  variation: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: 'blue' | 'green' | 'red' | 'amber';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  variation,
  icon: Icon,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700'
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600'
  };

  const isPositiveVariation = variation >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} className={iconColorClasses[color]} />
        </div>
        <div className="flex items-center space-x-1">
          {isPositiveVariation ? (
            <TrendingUp size={16} className="text-green-600" />
          ) : (
            <TrendingDown size={16} className="text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            isPositiveVariation ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositiveVariation ? '+' : ''}{variation}%
          </span>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
      </div>
    </div>
  );
};