import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Edit, Trash2, Building2, User, Calendar, Search, ChevronLeft, ChevronRight, X, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Building, Mission, User as UserType } from '../types/auth';
import { useSearchParams } from 'react-router-dom';

interface MissionFormData {
  title: string;
  scheduled_start_date: string;
  assigned_to: string;
  building_ids: string[];
}

const ITEMS_PER_PAGE = 10;

export const ExpertMissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [constateurs, setConstateurs] = useState<UserType[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedConstateur, setSelectedConstateur] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState<MissionFormData>({
    title: '',
    scheduled_start_date: '',
    assigned_to: '',
    building_ids: [],
  });

  const canManageMissions = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'expert';

  if (!canManageMissions) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ClipboardList className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Cette section est réservée aux experts pour gérer les missions.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterMissions();
  }, [missions, searchTerm, selectedStatus, selectedConstateur, selectedDateRange]);

  // Vérifier si le paramètre create=true est présent dans l'URL
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true') {
      setShowForm(true);
      // Supprimer le paramètre de l'URL après avoir ouvert le formulaire
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Nouveau useEffect pour gérer l'édition automatique via URL
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam && missions.length > 0 && !loading) {
      // Rechercher la mission correspondante
      const missionToEdit = missions.find(mission => mission.id === editParam);
      if (missionToEdit) {
        console.log('🔧 [ExpertMissionsPage] Auto-opening edit form for mission:', missionToEdit.title);
        handleEditMission(missionToEdit);
        // Supprimer le paramètre de l'URL après avoir ouvert le formulaire
        setSearchParams({});
      } else {
        console.warn('⚠️ [ExpertMissionsPage] Mission not found for edit ID:', editParam);
        setError(`Mission avec l'ID ${editParam} non trouvée`);
        setSearchParams({});
      }
    }
  }, [searchParams, missions, loading, setSearchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch buildings with updated schema
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, designation, is_active')
        .eq('is_active', true)
        .order('designation');

      if (buildingsError) throw buildingsError;
      setBuildings(buildingsData || []);

      // Fetch constateurs with role-based filtering
      let constateursQuery = supabase
        .from('users')
        .select('*')
        .eq('role', 'constateur')
        .eq('is_active', true)
        .order('full_name');

      // Apply role-based filtering for experts
      if (user?.role === 'expert') {
        constateursQuery = constateursQuery.eq('created_by', user.id);
      }

      const { data: constateursData, error: constateursError } = await constateursQuery;

      if (constateursError) {
        console.error('Error fetching constateurs:', constateursError);
        setConstateurs([]);
      } else {
        setConstateurs(constateursData || []);
      }

      // Fetch missions with related data
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select(`
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
          )
        `)
        .order('created_at', { ascending: false });

      if (missionsError) throw missionsError;

      // Fetch mission buildings for each mission
      const missionsWithBuildings = await Promise.all(
        (missionsData || []).map(async (mission) => {
          const { data: missionBuildings } = await supabase
            .from('mission_buildings')
            .select(`
              building_id,
              buildings:building_id (
                id,
                designation
              )
            `)
            .eq('mission_id', mission.id);

          return {
            ...mission,
            mission_buildings: missionBuildings || []
          };
        })
      );

      setMissions(missionsWithBuildings);
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      setError(error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filterMissions = () => {
    let filtered = missions.filter(mission => {
      const matchesSearch = 
        mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mission as any).assigned_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !selectedStatus || mission.status === selectedStatus;
      const matchesConstateur = !selectedConstateur || mission.assigned_to === selectedConstateur;
      
      let matchesDate = true;
      if (selectedDateRange) {
        const today = new Date();
        const missionDate = new Date(mission.scheduled_start_date || mission.created_at);
        
        switch (selectedDateRange) {
          case 'today':
            matchesDate = missionDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = missionDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = missionDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesConstateur && matchesDate;
    });

    setFilteredMissions(filtered);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      scheduled_start_date: '',
      assigned_to: '',
      building_ids: [],
    });
    setShowForm(false);
    setEditingMission(null);
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Create mission with default values for removed fields
      const missionData = {
        title: formData.title,
        description: null,
        mission_type: 'inspection' as const,
        priority: 'medium' as const,
        scheduled_start_date: formData.scheduled_start_date || null,
        scheduled_end_date: null,
        assigned_to: formData.assigned_to || null,
        instructions: null,
        created_by: user?.id,
        status: 'draft' as const,
      };

      const { data: mission, error: missionError } = await supabase
        .from('missions')
        .insert(missionData)
        .select()
        .single();

      if (missionError) throw missionError;

      // Create mission-building relationships
      if (formData.building_ids.length > 0) {
        const missionBuildings = formData.building_ids.map(buildingId => ({
          mission_id: mission.id,
          building_id: buildingId,
        }));

        const { error: buildingsError } = await supabase
          .from('mission_buildings')
          .insert(missionBuildings);

        if (buildingsError) throw buildingsError;
      }

      await fetchData();
      resetForm();
      setError(null);
    } catch (error: any) {
      console.error('Error creating mission:', error);
      setError(error.message || 'Erreur lors de la création de la mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !editingMission) return;

    setIsSubmitting(true);
    try {
      // Update mission with only the simplified fields
      const missionData = {
        title: formData.title,
        scheduled_start_date: formData.scheduled_start_date || null,
        assigned_to: formData.assigned_to || null,
        updated_at: new Date().toISOString(),
      };

      const { error: missionError } = await supabase
        .from('missions')
        .update(missionData)
        .eq('id', editingMission.id);

      if (missionError) throw missionError;

      // Update mission-building relationships
      // First, delete existing relationships
      const { error: deleteError } = await supabase
        .from('mission_buildings')
        .delete()
        .eq('mission_id', editingMission.id);

      if (deleteError) throw deleteError;

      // Then, create new relationships
      if (formData.building_ids.length > 0) {
        const missionBuildings = formData.building_ids.map(buildingId => ({
          mission_id: editingMission.id,
          building_id: buildingId,
        }));

        const { error: buildingsError } = await supabase
          .from('mission_buildings')
          .insert(missionBuildings);

        if (buildingsError) throw buildingsError;
      }

      await fetchData();
      resetForm();
      setError(null);
    } catch (error: any) {
      console.error('Error updating mission:', error);
      setError(error.message || 'Erreur lors de la mise à jour de la mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMission = async (mission: Mission) => {
    setEditingMission(mission);
    
    // Fetch mission buildings
    const { data: missionBuildings } = await supabase
      .from('mission_buildings')
      .select('building_id')
      .eq('mission_id', mission.id);

    setFormData({
      title: mission.title,
      scheduled_start_date: mission.scheduled_start_date || '',
      assigned_to: mission.assigned_to || '',
      building_ids: missionBuildings?.map(mb => mb.building_id) || [],
    });
    setShowForm(true);
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) throw error;

      await fetchData();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression de la mission');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBuildingSelection = (buildingId: string) => {
    setFormData(prev => ({
      ...prev,
      building_ids: prev.building_ids.includes(buildingId)
        ? prev.building_ids.filter(id => id !== buildingId)
        : [...prev.building_ids, buildingId]
    }));
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-amber-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityDisplayName = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Faible';
      case 'medium':
        return 'Moyenne';
      case 'high':
        return 'Élevée';
      case 'urgent':
        return 'Urgente';
      default:
        return priority;
    }
  };

  const getMissionTypeDisplayName = (type: string) => {
    switch (type) {
      case 'inspection':
        return 'Inspection';
      case 'maintenance':
        return 'Maintenance';
      case 'audit':
        return 'Audit';
      case 'emergency':
        return 'Urgence';
      default:
        return type;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredMissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMissions = filteredMissions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-3 text-blue-600" />
            Gestion des missions
          </h1>
          <p className="text-gray-600 mt-2">
            Créez, assignez et suivez les missions de terrain.
            {user?.role === 'expert' && (
              <span className="block text-sm text-blue-600 mt-1">
                <Users size={14} className="inline mr-1" />
                Vous ne voyez que vos propres constatateurs dans les assignations.
              </span>
            )}
          </p>
        </div>
        <Button 
          icon={Plus}
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Nouvelle mission
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Show info about constateur filtering for experts */}
      {user?.role === 'expert' && constateurs.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <Users size={16} className="mr-2" />
            <span>
              Aucun constatateur disponible. Vous devez d'abord créer des constatateurs via la section "Mes Constatateurs" pour pouvoir leur assigner des missions.
            </span>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="assigned">Assignée</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminée</option>
              <option value="cancelled">Annulée</option>
            </select>

            <select
              value={selectedConstateur}
              onChange={(e) => setSelectedConstateur(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les constatateurs</option>
              {constateurs.map((constateur) => (
                <option key={constateur.id} value={constateur.id}>
                  {constateur.full_name || constateur.email}
                </option>
              ))}
            </select>

            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>

            <div className="text-sm text-gray-600 flex items-center">
              {filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de création/modification */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMission ? 'Modifier la mission' : 'Créer une nouvelle mission'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={resetForm}
              >
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingMission ? handleUpdateMission : handleCreateMission} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom mission *"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Nom de la mission"
                  required
                />
                <Input
                  label="Date mission *"
                  type="date"
                  name="scheduled_start_date"
                  value={formData.scheduled_start_date}
                  onChange={handleFormChange}
                  icon={Calendar}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigner à
                  {user?.role === 'expert' && (
                    <span className="text-xs text-blue-600 ml-1">(vos constatateurs uniquement)</span>
                  )}
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un constatateur</option>
                  {constateurs.map((constateur) => (
                    <option key={constateur.id} value={constateur.id}>
                      {constateur.full_name || constateur.email}
                    </option>
                  ))}
                </select>
                {user?.role === 'expert' && constateurs.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Aucun constatateur disponible. Créez d'abord des constatateurs via "Mes Constatateurs".
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bâtiments concernés
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {buildings.map((building) => (
                    <label key={building.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.building_ids.includes(building.id)}
                        onChange={() => handleBuildingSelection(building.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">
                        {building.designation}
                      </span>
                    </label>
                  ))}
                </div>
                {formData.building_ids.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {formData.building_ids.length} bâtiment{formData.building_ids.length > 1 ? 's' : ''} sélectionné{formData.building_ids.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingMission ? 'Mettre à jour' : 'Créer la mission'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des missions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Liste des missions
          </h2>
        </CardHeader>
        <CardContent>
          {currentMissions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedStatus || selectedConstateur || selectedDateRange ? 'Aucun résultat' : 'Aucune mission'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || selectedStatus || selectedConstateur || selectedDateRange
                  ? 'Aucune mission ne correspond à vos critères de recherche.'
                  : 'Créez votre première mission.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentMissions.map((mission) => (
                  <div key={mission.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {mission.title}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(mission.status)}`}>
                            {getStatusDisplayName(mission.status)}
                          </span>
                          <span className={`text-sm font-medium ${getPriorityColor(mission.priority)}`}>
                            {getPriorityDisplayName(mission.priority)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center">
                            <ClipboardList size={14} className="mr-1" />
                            {getMissionTypeDisplayName(mission.mission_type)}
                          </span>
                          
                          {mission.scheduled_start_date && (
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {new Date(mission.scheduled_start_date).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                          
                          {(mission as any).assigned_user && (
                            <span className="flex items-center">
                              <User size={14} className="mr-1" />
                              {(mission as any).assigned_user.full_name || (mission as any).assigned_user.email}
                            </span>
                          )}
                        </div>

                        {mission.description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {mission.description}
                          </p>
                        )}

                        {/* Bâtiments associés */}
                        {(mission as any).mission_buildings && (mission as any).mission_buildings.length > 0 && (
                          <div className="flex items-center space-x-2 mb-3">
                            <Building2 size={14} className="text-gray-500" />
                            <div className="flex flex-wrap gap-1">
                              {(mission as any).mission_buildings.slice(0, 3).map((mb: any, index: number) => (
                                <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                  {mb.buildings?.designation}
                                </span>
                              ))}
                              {(mission as any).mission_buildings.length > 3 && (
                                <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                  +{(mission as any).mission_buildings.length - 3} autres
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Edit}
                          onClick={() => handleEditMission(mission)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteMission(mission.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        Créée le {new Date(mission.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <div className="flex items-center space-x-2">
                        {mission.status === 'completed' && (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                        {mission.priority === 'urgent' && (
                          <AlertCircle size={16} className="text-red-600" />
                        )}
                        {mission.status === 'in_progress' && (
                          <Clock size={16} className="text-amber-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredMissions.length)} sur {filteredMissions.length} résultats
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronLeft}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            page === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronRight}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};