import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Material } from '../../types/auth';
import { AddMaterialForm } from './AddMaterialForm';
import { calculateMaterialProgress } from '../../utils/progressCalculations';

interface MissionMaterialsTabProps {
  missionId: string;
  canEdit: boolean;
  onDataUpdate?: () => void;
}

export const MissionMaterialsTab: React.FC<MissionMaterialsTabProps> = ({ 
  missionId, 
  canEdit,
  onDataUpdate
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  useEffect(() => {
    fetchMissionMaterials();
  }, [missionId]);

  const fetchMissionMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les bâtiments de la mission
      const { data: missionBuildings, error: mbError } = await supabase
        .from('mission_buildings')
        .select('building_id')
        .eq('mission_id', missionId);

      if (mbError) throw mbError;

      if (!missionBuildings || missionBuildings.length === 0) {
        setMaterials([]);
        return;
      }

      const buildingIds = missionBuildings.map(mb => mb.building_id);

      // Récupérer les matériels des bâtiments de la mission
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          buildings:building_id (
            id,
            designation
          )
        `)
        .in('building_id', buildingIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des matériels');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setShowAddForm(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setShowAddForm(true);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce matériel ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      await fetchMissionMaterials();
      // Notify parent component to update mission summary
      if (onDataUpdate) {
        onDataUpdate();
      }
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression du matériel');
    }
  };

  const handleFormSuccess = () => {
    // Don't close the form anymore - let the form handle its own state
    fetchMissionMaterials();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-amber-100 text-amber-800';
      case 'out_of_order':
        return 'bg-red-100 text-red-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Opérationnel';
      case 'maintenance':
        return 'Maintenance';
      case 'out_of_order':
        return 'Hors service';
      case 'retired':
        return 'Retiré';
      default:
        return status;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'bon':
        return 'bg-green-100 text-green-800';
      case 'acceptable':
        return 'bg-amber-100 text-amber-800';
      case 'vetuste':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionDisplayName = (condition: string) => {
    switch (condition) {
      case 'bon':
        return 'Bon';
      case 'acceptable':
        return 'Acceptable';
      case 'vetuste':
        return 'Vétuste';
      default:
        return condition;
    }
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
          Matériels de la mission ({materials.length})
        </h3>
        {canEdit && (
          <Button
            icon={Plus}
            onClick={handleAddMaterial}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Ajouter un matériel
          </Button>
        )}
      </div>

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">
                {editingMaterial ? 'Modifier le matériel' : 'Ajouter un matériel'}
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
            <AddMaterialForm
              missionId={missionId}
              material={editingMaterial}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Liste des matériels - Masquée quand le formulaire est affiché */}
      {!showAddForm && (
        <>
          {materials.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Wrench size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun matériel associé
              </h3>
              <p className="text-gray-600 mb-4">
                Cette mission n'a pas encore de matériels associés.
              </p>
              {canEdit && (
                <Button
                  icon={Plus}
                  onClick={handleAddMaterial}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Ajouter le premier matériel
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material) => {
                const progress = calculateMaterialProgress(material);
                const progressColor = getProgressColor(progress);
                
                return (
                  <Card key={material.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {material.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {(material as any).buildings?.designation || 'Bâtiment inconnu'}
                          </p>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(material.status)}`}>
                              {getStatusDisplayName(material.status)}
                            </span>
                            {material.condition && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(material.condition)}`}>
                                {getConditionDisplayName(material.condition)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            {material.category}
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Modifier"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(material.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Supprimer"
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

                        {/* Détails du matériel */}
                        <div className="space-y-2">
                          {material.quantity && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Quantité :</span>
                              <span className="font-medium">{material.quantity}</span>
                            </div>
                          )}

                          {material.brand && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Marque :</span>
                              <span className="font-medium">{material.brand}</span>
                            </div>
                          )}

                          {material.model && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Modèle :</span>
                              <span className="font-medium">{material.model}</span>
                            </div>
                          )}

                          {material.manufacturing_year && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Année :</span>
                              <span className="font-medium">{material.manufacturing_year}</span>
                            </div>
                          )}

                          {material.new_value_mad && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Valeur neuf :</span>
                              <span className="font-medium text-green-600">{material.new_value_mad} MAD</span>
                            </div>
                          )}

                          {material.obsolescence_percentage !== undefined && material.obsolescence_percentage > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Vétusté :</span>
                              <span className="font-medium text-amber-600">{material.obsolescence_percentage}%</span>
                            </div>
                          )}

                          {material.warranty_end_date && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Garantie :</span>
                              <span className={`font-medium flex items-center ${
                                new Date(material.warranty_end_date) < new Date() 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {new Date(material.warranty_end_date) < new Date() && (
                                  <AlertTriangle size={14} className="mr-1" />
                                )}
                                {new Date(material.warranty_end_date).toLocaleDateString('fr-FR')}
                              </span>
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