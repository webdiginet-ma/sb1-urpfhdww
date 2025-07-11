import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Building } from '../../types/auth';
import { AddBuildingForm } from './AddBuildingForm';
import { calculateBuildingProgress } from '../../utils/progressCalculations';

interface MissionBuildingsTabProps {
  missionId: string;
  canEdit: boolean;
  onDataUpdate?: () => void;
}

export const MissionBuildingsTab: React.FC<MissionBuildingsTabProps> = ({ 
  missionId, 
  canEdit,
  onDataUpdate
}) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  useEffect(() => {
    fetchMissionBuildings();
  }, [missionId]);

  const fetchMissionBuildings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('mission_buildings')
        .select(`
          building_id,
          buildings:building_id (
            id,
            designation,
            basement_area_sqm,
            ground_floor_area_sqm,
            first_floor_area_sqm,
            total_area,
            technical_elements,
            miscellaneous_elements,
            new_value_mad,
            obsolescence_percentage,
            depreciated_value_mad,
            contiguity,
            communication,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('mission_id', missionId);

      if (error) throw error;

      const buildingsData = data?.map(item => item.buildings).filter(Boolean) || [];
      setBuildings(buildingsData as Building[]);
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des bâtiments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuilding = () => {
    setEditingBuilding(null);
    setShowAddForm(true);
  };

  const handleEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setShowAddForm(true);
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce bâtiment de la mission ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('mission_buildings')
        .delete()
        .eq('mission_id', missionId)
        .eq('building_id', buildingId);

      if (error) throw error;

      await fetchMissionBuildings();
      // Notify parent component to update mission summary
      if (onDataUpdate) {
        onDataUpdate();
      }
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression du bâtiment');
    }
  };

  const handleFormSuccess = () => {
    // Don't close the form anymore - let the form handle its own state
    fetchMissionBuildings();
    // Notify parent component to update mission summary
    if (onDataUpdate) {
      onDataUpdate();
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Bâtiments de la mission ({buildings.length})
        </h3>
        {canEdit && (
          <Button
            icon={Plus}
            onClick={handleAddBuilding}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Ajouter un bâtiment
          </Button>
        )}
      </div>

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">
                {editingBuilding ? 'Modifier le bâtiment' : 'Ajouter un bâtiment'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => setShowAddForm(false)}
              >
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AddBuildingForm
              missionId={missionId}
              building={editingBuilding}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Liste des bâtiments - Masquée quand le formulaire est affiché */}
      {!showAddForm && (
        <>
          {buildings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun bâtiment associé
              </h3>
              <p className="text-gray-600 mb-4">
                Cette mission n'a pas encore de bâtiments associés.
              </p>
              {canEdit && (
                <Button
                  icon={Plus}
                  onClick={handleAddBuilding}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Ajouter le premier bâtiment
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {buildings.map((building) => {
                const progress = calculateBuildingProgress(building);
                const progressColor = getProgressColor(progress);
                
                return (
                  <Card key={building.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {building.designation}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            building.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {building.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditBuilding(building)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Modifier"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteBuilding(building.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Retirer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Barre de progression */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Progression des éléments</span>
                            <span className="text-sm font-bold text-gray-900">{progress}%</span>
                          </div>
                          <ProgressBar progress={progress} color={progressColor} height="h-2" />
                        </div>

                        {/* Détails du bâtiment */}
                        <div className="space-y-3">
                          {/* Surfaces */}
                          {building.total_area && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Surface totale :</span>
                              <span className="font-medium text-blue-600">{building.total_area} m²</span>
                            </div>
                          )}

                          {/* Valeurs financières */}
                          {building.new_value_mad && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Valeur à neuf :</span>
                              <span className="font-medium text-green-600">{building.new_value_mad} MAD</span>
                            </div>
                          )}
                          
                          {building.obsolescence_percentage !== undefined && building.obsolescence_percentage > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Vétusté :</span>
                              <span className="font-medium text-amber-600">{building.obsolescence_percentage}%</span>
                            </div>
                          )}

                          {building.depreciated_value_mad && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Valeur vétustée :</span>
                              <span className="font-medium text-red-600">{building.depreciated_value_mad} MAD</span>
                            </div>
                          )}

                          {/* Éléments techniques */}
                          {building.technical_elements && Object.keys(building.technical_elements).length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500">
                                {Object.keys(building.technical_elements).length} éléments techniques renseignés
                              </span>
                            </div>
                          )}

                          {/* Éléments divers */}
                          {building.miscellaneous_elements && Array.isArray(building.miscellaneous_elements) && building.miscellaneous_elements.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {building.miscellaneous_elements.length} éléments divers renseignés
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};