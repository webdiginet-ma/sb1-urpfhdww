import React, { useState, useEffect } from 'react';
import { Wrench, Calculator, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Material, Building } from '../../types/auth';

interface MaterialFormData {
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  building_id: string;
  quantity: string;
  manufacturing_year: string;
  condition: 'bon' | 'acceptable' | 'vetuste';
  new_value_mad: string;
  obsolescence_percentage: string;
}

interface AddMaterialFormProps {
  missionId: string;
  material?: Material | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const getInitialFormData = (material?: Material | null): MaterialFormData => ({
  name: material?.name || '',
  brand: material?.brand || '',
  model: material?.model || '',
  serial_number: material?.serial_number || '',
  building_id: material?.building_id || '',
  quantity: material?.quantity?.toString() || '1',
  manufacturing_year: material?.manufacturing_year?.toString() || '',
  condition: material?.condition || 'bon',
  new_value_mad: material?.new_value_mad?.toString() || '',
  obsolescence_percentage: material?.obsolescence_percentage?.toString() || '0',
});

export const AddMaterialForm: React.FC<AddMaterialFormProps> = ({
  missionId,
  material,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<MaterialFormData>(getInitialFormData(material));

  useEffect(() => {
    fetchMissionBuildings();
  }, [missionId]);

  const fetchMissionBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('mission_buildings')
        .select(`
          building_id,
          buildings:building_id (
            id,
            designation,
            is_active
          )
        `)
        .eq('mission_id', missionId);

      if (error) throw error;

      const buildingsData = data?.map(item => item.buildings).filter(Boolean) || [];
      setBuildings(buildingsData as Building[]);
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des bâtiments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const materialData = {
        name: formData.name,
        category: 'general', // Default category since we removed the field
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        status: 'operational', // Default status since we removed the field
        building_id: formData.building_id,
        quantity: parseInt(formData.quantity) || 1,
        manufacturing_year: formData.manufacturing_year ? parseInt(formData.manufacturing_year) : null,
        condition: formData.condition,
        new_value_mad: formData.new_value_mad ? parseFloat(formData.new_value_mad) : null,
        obsolescence_percentage: formData.obsolescence_percentage ? parseFloat(formData.obsolescence_percentage) : 0,
        created_by: user?.id,
      };

      if (material) {
        // Mise à jour du matériel existant
        const { error: updateError } = await supabase
          .from('materials')
          .update({
            ...materialData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', material.id);

        if (updateError) throw updateError;
        setSuccessMessage('Matériel mis à jour avec succès !');
      } else {
        // Création d'un nouveau matériel
        const { error: createError } = await supabase
          .from('materials')
          .insert(materialData);

        if (createError) throw createError;
        setSuccessMessage('Matériel ajouté avec succès !');
        
        // Reset form for new material creation
        setFormData(getInitialFormData());
      }

      // Call onSuccess to refresh data
      onSuccess();

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (error: any) {
      setError(error.message || 'Erreur lors de la sauvegarde du matériel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const calculateDepreciatedValue = (): number => {
    const value = parseFloat(formData.new_value_mad) || 0;
    const percentage = parseFloat(formData.obsolescence_percentage) || 0;
    return value * (percentage / 100);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle size={18} className="flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: Informations de base */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Wrench className="mr-2" size={18} />
          Informations de base
        </h4>
        <div className="space-y-4">
          <Input
            label="Désignation *"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nom du matériel"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bâtiment associé *
            </label>
            <select
              name="building_id"
              value={formData.building_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un bâtiment</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.designation}
                </option>
              ))}
            </select>
            {buildings.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">
                Aucun bâtiment disponible. Ajoutez d'abord un bâtiment à cette mission.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Détails techniques */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Détails techniques</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Marque"
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            placeholder="Marque du matériel"
          />
          <Input
            label="Modèle"
            type="text"
            name="model"
            value={formData.model}
            onChange={handleChange}
            placeholder="Modèle"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="Quantité *"
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="1"
            min="1"
            required
          />
          <Input
            label="Numéro de série"
            type="text"
            name="serial_number"
            value={formData.serial_number}
            onChange={handleChange}
            placeholder="Numéro de série"
          />
          <Input
            label="Année de fabrication"
            type="number"
            name="manufacturing_year"
            value={formData.manufacturing_year}
            onChange={handleChange}
            placeholder="2023"
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            État du matériel
          </label>
          <div className="space-y-2">
            {[
              { value: 'bon', label: 'Bon', color: 'text-green-600' },
              { value: 'acceptable', label: 'Acceptable', color: 'text-amber-600' },
              { value: 'vetuste', label: 'Vétuste', color: 'text-red-600' }
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="condition"
                  value={option.value}
                  checked={formData.condition === option.value}
                  onChange={handleChange}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className={`font-medium ${option.color}`}>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Valeurs financières */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator className="mr-2" size={18} />
          Valeurs financières
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Valeur à neuf (MAD)"
            type="number"
            name="new_value_mad"
            value={formData.new_value_mad}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
          <Input
            label="Vétusté (%)"
            type="number"
            name="obsolescence_percentage"
            value={formData.obsolescence_percentage}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="100"
            step="1"
          />
        </div>

        {/* Valeur après vétusté calculée */}
        {formData.new_value_mad && (
          <div className="mt-4 p-3 bg-white border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Valeur après vétusté :</span>
              <span className="text-lg font-bold text-green-700">
                {calculateDepreciatedValue().toFixed(2)} MAD
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={buildings.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {material ? 'Mettre à jour' : 'Ajouter le matériel'}
        </Button>
      </div>
    </form>
  );
};