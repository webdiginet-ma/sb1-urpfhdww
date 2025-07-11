import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

interface MissionWithoutPlan {
  id: string;
  title: string;
  scheduled_start_date: string | null;
  status: string;
}

export const MissionsWithoutPlanAlert: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<MissionWithoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchMissionsWithoutPlan();
  }, [user]);

  const fetchMissionsWithoutPlan = async () => {
    try {
      let query = supabase
        .from('missions')
        .select('id, title, scheduled_start_date, status')
        .is('plan_de_masse_url', null)
        .in('status', ['draft', 'assigned', 'in_progress']);

      // Appliquer les filtres selon le rôle
      if (user?.role === 'constateur') {
        query = query.eq('assigned_to', user.id);
      } else if (user?.role === 'expert') {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.limit(5);

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des missions sans plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = (missionId: string) => {
    navigate(`/missions/${missionId}`);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (loading || dismissed || missions.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-amber-900">
              Missions sans plan de masse
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {missions.length} mission{missions.length > 1 ? 's' : ''} nécessite{missions.length > 1 ? 'nt' : ''} un plan de masse
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {missions.map((mission) => (
          <div key={mission.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-200">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{mission.title}</h4>
              <p className="text-sm text-gray-600">
                {mission.scheduled_start_date 
                  ? `Prévue le ${new Date(mission.scheduled_start_date).toLocaleDateString('fr-FR')}`
                  : 'Date non définie'
                }
              </p>
            </div>
            <Button
              size="sm"
              icon={Plus}
              onClick={() => handleAddPlan(mission.id)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ajouter plan
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};