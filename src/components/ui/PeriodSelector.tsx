import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PeriodType } from '../../services/dashboardService';

interface PeriodSelectorProps {
  value: PeriodType;
  onChange: (period: PeriodType, customStart?: Date, customEnd?: Date) => void;
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Charger la sélection depuis localStorage au montage
  useEffect(() => {
    const savedPeriod = localStorage.getItem('dashboard_period');
    const savedCustomStart = localStorage.getItem('dashboard_custom_start');
    const savedCustomEnd = localStorage.getItem('dashboard_custom_end');
    
    if (savedPeriod && savedPeriod !== value) {
      if (savedPeriod === 'personnalise' && savedCustomStart && savedCustomEnd) {
        setCustomStart(savedCustomStart);
        setCustomEnd(savedCustomEnd);
        setShowCustomDates(true);
        onChange(savedPeriod as PeriodType, new Date(savedCustomStart), new Date(savedCustomEnd));
      } else {
        onChange(savedPeriod as PeriodType);
      }
    }
  }, []);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    if (newPeriod === 'personnalise') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      localStorage.setItem('dashboard_period', newPeriod);
      onChange(newPeriod);
    }
  };

  const handleCustomDatesSubmit = () => {
    if (customStart && customEnd) {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      
      if (startDate <= endDate) {
        localStorage.setItem('dashboard_period', 'personnalise');
        localStorage.setItem('dashboard_custom_start', customStart);
        localStorage.setItem('dashboard_custom_end', customEnd);
        onChange('personnalise', startDate, endDate);
        setShowCustomDates(false);
      }
    }
  };

  const periods = [
    { value: 'ce_mois', label: 'Ce mois-ci' },
    { value: '3_mois', label: '3 derniers mois' },
    { value: 'annee_courante', label: 'Année en cours' },
    { value: 'annee_precedente', label: 'Année précédente' },
    { value: 'personnalise', label: 'Plage personnalisée...' },
  ];

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <Calendar size={18} className="text-gray-500" />
        <select
          value={value}
          onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
        >
          {periods.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      {/* Modal pour les dates personnalisées */}
      {showCustomDates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Sélectionner une plage personnalisée</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCustomDates(false);
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCustomDatesSubmit}
                disabled={!customStart || !customEnd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};