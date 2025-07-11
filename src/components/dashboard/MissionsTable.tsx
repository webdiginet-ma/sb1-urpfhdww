import React from 'react';
import { Eye, CheckCircle, X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardMission } from '../../services/dashboardService';
import { ProgressBar } from '../ui/ProgressBar';

interface MissionsTableProps {
  missions: DashboardMission[];
}

export const MissionsTable: React.FC<MissionsTableProps> = ({ missions }) => {
  const navigate = useNavigate();

  const handleViewMission = (missionId: string) => {
    navigate(`/missions/${missionId}`);
  };

  const getProgressColor = (progress: number): string => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  if (missions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Calendar size={48} className="mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune mission en cours</h3>
        <p className="text-gray-600">Il n'y a actuellement aucune mission en cours pour cette période.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lieu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Constatateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Avancement
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date butoir
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {missions.map((mission) => (
              <tr 
                key={mission.id} 
                className="hover:bg-gray-50 transition-colors duration-150 group"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {mission.title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {mission.lieu}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {mission.constateur_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <ProgressBar 
                        progress={mission.progress} 
                        color={getProgressColor(mission.progress)}
                        height="h-2"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
                      {mission.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {mission.has_plan ? (
                    <CheckCircle size={20} className="text-green-600 mx-auto" />
                  ) : (
                    <X size={20} className="text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {mission.scheduled_start_date 
                      ? new Date(mission.scheduled_start_date).toLocaleDateString('fr-FR')
                      : 'Non définie'
                    }
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => handleViewMission(mission.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye size={14} className="mr-1" />
                    Voir fiche
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};