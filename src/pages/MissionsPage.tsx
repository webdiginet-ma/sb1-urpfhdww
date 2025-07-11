import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Calendar, User, AlertCircle, CheckCircle, Eye, Search, Filter, Building2, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Mission } from '../types/auth';

interface MissionWithBuildings extends Mission {
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  mission_buildings?: Array<{
    building_id: string;
    buildings: {
      id: string;
      designation: string;
    };
  }>;
  // Ajout des compteurs réels
  buildings_count?: number;
  materials_count?: number;
}

export const MissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { canManageMissions } = useRolePermissions();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<MissionWithBuildings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMissions();
  }, [user]);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Déterminer directement si l'utilisateur est un constatateur
      const isCurrentUserConstateur = user?.role === 'constateur';

      // 🔍 DEBUG: Log user information
      console.log('🔍 [MissionsPage] DEBUG - User information:');
      console.log('- User ID:', user?.id);
      console.log('- User role:', user?.role);
      console.log('- User email:', user?.email);
      console.log('- isCurrentUserConstateur:', isCurrentUserConstateur);
      console.log('- canManageMissions:', canManageMissions);

      let query = supabase.from('missions').select(`
        *,
        assigned_user:assigned_to (
          id,
          full_name,
          email
        ),
        created_user:created_by (
          id,
          full_name,
          email
        ),
        mission_buildings (
          building_id,
          buildings:building_id (
            id,
            designation
          )
        )
      `);

      // 🔍 DEBUG: Log query construction
      console.log('🔍 [MissionsPage] DEBUG - Query construction:');
      console.log('- Base query created');

      // Si c'est un constatateur, ne voir que ses missions assignées
      if (isCurrentUserConstateur) {
        console.log('- Adding filter for constateur: assigned_to =', user?.id);
        query = query.eq('assigned_to', user?.id);
      } else {
        console.log('- No constateur filter applied (user can see all missions)');
      }

      console.log('- Adding order by created_at desc');
      query = query.order('created_at', { ascending: false });

      // 🔍 DEBUG: Execute query and log results
      console.log('🔍 [MissionsPage] DEBUG - Executing Supabase query...');
      const { data, error } = await query;

      console.log('🔍 [MissionsPage] DEBUG - Query results:');
      console.log('- Error:', error);
      console.log('- Data length:', data?.length || 0);
      console.log('- Raw data:', data);

      if (error) {
        console.error('❌ [MissionsPage] Supabase error:', error);
        throw error;
      }

      // Enrichir les missions avec les compteurs réels de bâtiments et matériels
      const enrichedMissions = await Promise.all(
        (data || []).map(async (mission) => {
          try {
            // Compter les bâtiments réels pour cette mission
            const { count: buildingsCount, error: buildingsError } = await supabase
              .from('mission_buildings')
              .select('*', { count: 'exact', head: true })
              .eq('mission_id', mission.id);

            if (buildingsError) {
              console.warn('⚠️ [MissionsPage] Error counting buildings for mission', mission.id, ':', buildingsError);
            }

            // Compter les matériels réels pour cette mission
            let materialsCount = 0;
            if (buildingsCount && buildingsCount > 0) {
              // Récupérer les IDs des bâtiments de cette mission
              const { data: missionBuildings, error: mbError } = await supabase
                .from('mission_buildings')
                .select('building_id')
                .eq('mission_id', mission.id);

              if (!mbError && missionBuildings && missionBuildings.length > 0) {
                const buildingIds = missionBuildings.map(mb => mb.building_id);
                
                // Compter les matériels dans ces bâtiments
                const { count: materialsCountResult, error: materialsError } = await supabase
                  .from('materials')
                  .select('*', { count: 'exact', head: true })
                  .in('building_id', buildingIds)
                  .eq('is_active', true);

                if (materialsError) {
                  console.warn('⚠️ [MissionsPage] Error counting materials for mission', mission.id, ':', materialsError);
                } else {
                  materialsCount = materialsCountResult || 0;
                }
              }
            }

            return {
              ...mission,
              buildings_count: buildingsCount || 0,
              materials_count: materialsCount
            };
          } catch (enrichError) {
            console.warn('⚠️ [MissionsPage] Error enriching mission', mission.id, ':', enrichError);
            return {
              ...mission,
              buildings_count: mission.mission_buildings?.length || 0,
              materials_count: 0
            };
          }
        })
      );

      // 🔍 DEBUG: Log mission details
      if (enrichedMissions && enrichedMissions.length > 0) {
        console.log('🔍 [MissionsPage] DEBUG - Enriched mission details:');
        enrichedMissions.forEach((mission, index) => {
          console.log(`- Mission ${index + 1}:`, {
            id: mission.id,
            title: mission.title,
            status: mission.status,
            assigned_to: mission.assigned_to,
            created_by: mission.created_by,
            buildings_count: mission.buildings_count,
            materials_count: mission.materials_count,
            assigned_user: mission.assigned_user,
            created_user: mission.created_user
          });
        });
      } else {
        console.log('🔍 [MissionsPage] DEBUG - No missions found');
        
        // 🔍 DEBUG: Additional check - let's see if there are ANY missions in the database
        console.log('🔍 [MissionsPage] DEBUG - Checking total missions in database...');
        const { data: allMissions, error: allError } = await supabase
          .from('missions')
          .select('id, title, assigned_to, created_by, status')
          .order('created_at', { ascending: false });
        
        console.log('- Total missions in database:', allMissions?.length || 0);
        console.log('- All missions:', allMissions);
        
        if (allMissions && allMissions.length > 0) {
          console.log('🔍 [MissionsPage] DEBUG - Missions exist but not showing. Checking assignment:');
          allMissions.forEach((mission, index) => {
            const isAssignedToUser = mission.assigned_to === user?.id;
            const isCreatedByUser = mission.created_by === user?.id;
            console.log(`- Mission ${index + 1} (${mission.title}):`, {
              assigned_to: mission.assigned_to,
              created_by: mission.created_by,
              isAssignedToUser,
              isCreatedByUser,
              status: mission.status
            });
          });
        }
      }

      setMissions(enrichedMissions);
    } catch (error: any) {
      console.error('💥 [MissionsPage] Error in fetchMissions:', error);
      setError(error.message || 'Erreur lors du chargement des missions');
    } finally {
      setLoading(false);
      console.log('🔍 [MissionsPage] DEBUG - fetchMissions completed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'assigned':
        return 'Assignée';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const calculateProgress = (mission: MissionWithBuildings): number => {
    // Simulation de la progression basée sur le statut
    switch (mission.status) {
      case 'draft':
        return 0;
      case 'assigned':
        return 15;
      case 'in_progress':
        return Math.floor(Math.random() * 50) + 25; // 25-75%
      case 'completed':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const getValidationStatus = (mission: MissionWithBuildings): { text: string; color: string } => {
    if (mission.status === 'completed') {
      return { text: 'Validé', color: 'text-green-600' };
    }
    if (mission.status === 'in_progress') {
      return { text: 'Validation incomplète', color: 'text-amber-600' };
    }
    return { text: 'En attente', color: 'text-gray-600' };
  };

  const handleViewMission = (missionId: string) => {
    console.log('🔍 [MissionsPage] DEBUG - Navigating to mission:', missionId);
    navigate(`/missions/${missionId}`);
  };

  const handleCreateMission = () => {
    console.log('🔍 [MissionsPage] DEBUG - Navigating to add-mission page');
    // Rediriger directement vers la page de création de mission
    navigate('/add-mission');
  };

  // Filtrer les missions selon le terme de recherche
  const filteredMissions = missions.filter(mission =>
    mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.assigned_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔍 DEBUG: Log filtered missions
  console.log('🔍 [MissionsPage] DEBUG - Filtered missions:', {
    totalMissions: missions.length,
    filteredMissions: filteredMissions.length,
    searchTerm
  });

  // Séparer les missions en cours et clôturées
  const ongoingMissions = filteredMissions.filter(mission => 
    !['completed', 'cancelled'].includes(mission.status)
  );

  const completedMissions = filteredMissions.filter(mission => 
    ['completed', 'cancelled'].includes(mission.status)
  );

  // 🔍 DEBUG: Log mission separation
  console.log('🔍 [MissionsPage] DEBUG - Mission separation:', {
    ongoingMissions: ongoingMissions.length,
    completedMissions: completedMissions.length
  });

  const renderMissionCard = (mission: MissionWithBuildings) => {
    const progress = calculateProgress(mission);
    const progressColor = getProgressColor(progress);
    const validation = getValidationStatus(mission);
    
    // Utiliser les compteurs réels au lieu des valeurs simulées
    const buildingCount = mission.buildings_count || 0;
    const materialCount = mission.materials_count || 0;

    return (
      <Card key={mission.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500" onClick={() => handleViewMission(mission.id)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header avec titre et date */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {mission.title}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar size={14} />
                  <span>
                    {mission.scheduled_start_date 
                      ? new Date(mission.scheduled_start_date).toLocaleDateString('fr-FR')
                      : new Date(mission.created_at).toLocaleDateString('fr-FR')
                    }
                  </span>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(mission.status)}`}>
                {getStatusDisplayName(mission.status)}
              </span>
            </div>

            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Progression</span>
                <span className="text-sm font-bold text-gray-900">{progress}%</span>
              </div>
              <ProgressBar progress={progress} color={progressColor} height="h-3" />
            </div>

            {/* Statuts et indicateurs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Statut Plan de masse */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${mission.plan_de_masse_url ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-700">Plan de masse</span>
                </div>
              </div>
            </div>

            {/* Compteurs bâtiments et matériels - MAINTENANT SYNCHRONISÉS */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1 text-gray-600">
                <Building2 size={16} />
                <span>{buildingCount} bâtiment{buildingCount > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-600">
                <Wrench size={16} />
                <span>{materialCount} matériel{materialCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Statut de validation */}
            <div className="flex items-center space-x-2">
              <AlertCircle size={16} className={validation.color} />
              <span className={`text-sm font-medium ${validation.color}`}>
                {validation.text}
              </span>
            </div>

            {/* Assigné à */}
            {mission.assigned_user && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User size={14} />
                <span>
                  {mission.assigned_user.full_name || mission.assigned_user.email}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMissionsList = (missionsList: MissionWithBuildings[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (missionsList.length === 0) {
      return (
        <div className="text-center py-12">
          <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {emptyMessage}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Aucune mission ne correspond à votre recherche.'
              : user?.role === 'constateur'
                ? 'Vous n\'avez actuellement aucune mission dans cette catégorie.'
                : 'Aucune mission dans cette catégorie.'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {missionsList.map(renderMissionCard)}
      </div>
    );
  };

  const tabs = [
    {
      id: 'ongoing',
      label: 'Missions en cours',
      icon: ClipboardList,
      badge: ongoingMissions.length,
      content: renderMissionsList(ongoingMissions, 'Aucune mission en cours'),
    },
    {
      id: 'completed',
      label: 'Missions clôturées',
      icon: CheckCircle,
      badge: completedMissions.length,
      content: renderMissionsList(completedMissions, 'Aucune mission clôturée'),
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-3 text-blue-600" />
            {user?.role === 'constateur' ? 'Mes missions' : 'Gestion des missions'}
          </h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'constateur'
              ? 'Consultez et gérez vos missions assignées.'
              : 'Suivez l\'avancement de toutes les missions de terrain.'
            }
          </p>
        </div>
        {canManageMissions && (
          <Button 
            icon={Plus}
            onClick={handleCreateMission}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Nouvelle mission
          </Button>
        )}
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une mission..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets des missions */}
      <Tabs tabs={tabs} defaultTab="ongoing" />
    </div>
  );
};