import React from 'react';
import { StatusTableRow } from '../../services/dashboardService';

interface StatusDistributionTableProps {
  data: StatusTableRow[];
}

export const StatusDistributionTable: React.FC<StatusDistributionTableProps> = ({ data }) => {
  // Déterminer quelle ligne mettre en surbrillance
  const highlightRow = data.find(row => row.statut === 'En cours' && row.count > 0) 
    ? 'En cours' 
    : 'Clôturées';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribution des statuts</h3>
      
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Quantité</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">% du total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isHighlighted = row.statut === highlightRow;
              const bgColor = isHighlighted 
                ? (row.statut === 'En cours' ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-green-50 border-l-4 border-l-green-500')
                : 'hover:bg-gray-50';
              
              return (
                <tr key={row.statut} className={`transition-colors duration-150 ${bgColor}`}>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        row.statut === 'En cours' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <span className={`font-medium ${
                        isHighlighted ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {row.statut}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-lg font-bold ${
                      isHighlighted 
                        ? (row.statut === 'En cours' ? 'text-blue-700' : 'text-green-700')
                        : 'text-gray-900'
                    }`}>
                      {row.count}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className={`font-medium ${
                        isHighlighted 
                          ? (row.statut === 'En cours' ? 'text-blue-700' : 'text-green-700')
                          : 'text-gray-700'
                      }`}>
                        {row.percent}%
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            row.statut === 'En cours' ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};