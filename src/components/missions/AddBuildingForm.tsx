import React, { useState } from 'react';
import { Building2, Calculator, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Building } from '../../types/auth';

interface BuildingFormData {
  designation: string;
  basement_area_sqm: string;
  ground_floor_area_sqm: string;
  first_floor_area_sqm: string;
  new_value_mad: string;
  obsolescence_percentage: string;
  contiguity: string;
  communication: string;
  technical_elements: {
    semelles: string[];
    elevations: string;
    ossature: string[];
    portes: string[];
    fenetres: string[];
    grillage: string[];
    facade: string[];
    toiture: string[];
    sol: string[];
    plafond: string[];
    escalier: string[];
    cloisonnement: string[];
  };
  miscellaneous_elements: string[];
}

interface AddBuildingFormProps {
  missionId: string;
  building?: Building | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Options pour les éléments techniques
const technicalOptions = {
  semelles: ['en béton armé', 'moellons', 'gros béton'],
  elevations: ['extérieur', 'intérieur'],
  ossature: ['béton armé', 'métallique', 'bois', 'plastique', 'panneau sandwich'],
  portes: ['PVC', 'Aluminium', 'Bois', 'Métallique', 'Coupe-feu', 'Sectionnelle', 'Iso plane', 'Coulissante', 'Pliante', 'Vitrage clair', 'Vitrage armé'],
  fenetres: ['Aluminium', 'PVC', 'Bois', 'Métallique', 'Coulissante', 'Basculante', 'Porte-fenêtre', 'Vitrage clair', 'Vitrage feuilleté', 'Verre armé', 'Vitrage teinté'],
  grillage: ['Métallique', 'Bois', 'Inox'],
  chassis: ['en métallique', 'en bois', 'en PVC', 'en aluminium', 'avec vitrage clair'],
  facade: ['Béton armé', 'Brique rouge', 'Mur rideau'],
  toiture: ['Dalle béton', 'Charpente métallique', 'Bac acier', 'Panneau sandwich', 'Bois', 'Fibres ciment', 'Zinc'],
  sol: ['Béton', 'Carrelage', 'Mosaïque', 'Marbre', 'Résine', 'Parquet', 'Moquette', 'Caillebotis', 'Tôles striées'],
  plafond: ['Enduit peint', 'Faux plafond staff', 'Plaque Armstrong'],
  escalier: ['Béton', 'Marbre', 'Mosaïque', 'Carrelage', 'Métallique', 'Caillebotis'],
  cloisonnement: ['Agglomérés', 'Panneaux sandwich', 'PVC', 'Aluminium', 'Bois', 'Verre', 'Métallique', 'Contreplaqué']
};

// Options pour les éléments divers
const miscellaneousOptions = [
  'Peinture sur murs',
  'Peinture sur menuiseries',
  'Papier peint',
  'Faïence',
  'Peinture sur éléments métalliques',
  'Revêtement partiel en carrelage',
  'Revêtement mural en faïence',
  'Revêtement mural en liège',
  'Revêtement mural en papier peint',
  'Revêtement mural en lambris',
  'Revêtement intérieur murs et cloisons',
  'Rideaux',
  'Stores',
  'Sanitaire : Lavabo',
  'Sanitaire : WC',
  'Sanitaire : Arrivée d\'eau',
  'Présence de chauffe-eau',
  'Évacuation des eaux usées',
  'Évacuation des eaux vannes',
  'Installation électrique',
  'Installation de chauffage (Climatisation)',
  'Ascenseur',
  'Zinguerie : Gouttières',
  'Zinguerie : Descentes d\'eaux pluviales'
];

const getInitialFormData = (building?: Building | null): BuildingFormData => ({
  designation: building?.designation || '',
  basement_area_sqm: building?.basement_area_sqm?.toString() || '0',
  ground_floor_area_sqm: building?.ground_floor_area_sqm?.toString() || '0',
  first_floor_area_sqm: building?.first_floor_area_sqm?.toString() || '0',
  new_value_mad: building?.new_value_mad?.toString() || '',
  obsolescence_percentage: building?.obsolescence_percentage?.toString() || '0',
  contiguity: building?.contiguity || 'neant',
  communication: building?.communication || 'neant',
  technical_elements: {
    semelles: Array.isArray((building?.technical_elements as any)?.semelles) ? (building?.technical_elements as any)?.semelles : [],
    elevations: Array.isArray((building?.technical_elements as any)?.elevations) ? (building?.technical_elements as any)?.elevations : [],
    ossature: Array.isArray((building?.technical_elements as any)?.ossature) ? (building?.technical_elements as any)?.ossature : [],
    portes: Array.isArray((building?.technical_elements as any)?.portes) ? (building?.technical_elements as any)?.portes : [],
    fenetres: Array.isArray((building?.technical_elements as any)?.fenetres) ? (building?.technical_elements as any)?.fenetres : [],
    grillage: Array.isArray((building?.technical_elements as any)?.grillage) ? (building?.technical_elements as any)?.grillage : [],
    facade: Array.isArray((building?.technical_elements as any)?.facade) ? (building?.technical_elements as any)?.facade : [],
    toiture: Array.isArray((building?.technical_elements as any)?.toiture) ? (building?.technical_elements as any)?.toiture : [],
    sol: Array.isArray((building?.technical_elements as any)?.sol) ? (building?.technical_elements as any)?.sol : [],
    plafond: Array.isArray((building?.technical_elements as any)?.plafond) ? (building?.technical_elements as any)?.plafond : [],
    escalier: Array.isArray((building?.technical_elements as any)?.escalier) ? (building?.technical_elements as any)?.escalier : [],
    cloisonnement: Array.isArray((building?.technical_elements as any)?.cloisonnement) ? (building?.technical_elements as any)?.cloisonnement : [],
  },
  miscellaneous_elements: (building?.miscellaneous_elements as string[]) || [],
});

export const AddBuildingForm: React.FC<AddBuildingFormProps> = ({
  missionId,
  building,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<BuildingFormData>(getInitialFormData(building));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const buildingData = {
        designation: formData.designation,
        basement_area_sqm: parseFloat(formData.basement_area_sqm) || 0,
        ground_floor_area_sqm: parseFloat(formData.ground_floor_area_sqm) || 0,
        first_floor_area_sqm: parseFloat(formData.first_floor_area_sqm) || 0,
        new_value_mad: formData.new_value_mad ? parseFloat(formData.new_value_mad) : null,
        obsolescence_percentage: parseFloat(formData.obsolescence_percentage) || 0,
        contiguity: formData.contiguity,
        communication: formData.communication,
        technical_elements: formData.technical_elements,
        miscellaneous_elements: formData.miscellaneous_elements,
        is_active: true,
        created_by: user?.id,
      };

      let buildingId: string;

      if (building) {
        // Mise à jour du bâtiment existant
        const { error: updateError } = await supabase
          .from('buildings')
          .update({
            ...buildingData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', building.id);

        if (updateError) throw updateError;
        buildingId = building.id;
        setSuccessMessage('Bâtiment mis à jour avec succès !');
      } else {
        // Création d'un nouveau bâtiment
        const { data: newBuilding, error: createError } = await supabase
          .from('buildings')
          .insert(buildingData)
          .select()
          .single();

        if (createError) throw createError;
        buildingId = newBuilding.id;

        // Associer le bâtiment à la mission
        const { error: linkError } = await supabase
          .from('mission_buildings')
          .insert({
            mission_id: missionId,
            building_id: buildingId,
          });

        if (linkError) throw linkError;
        
        setSuccessMessage('Bâtiment ajouté avec succès !');
        
        // Reset form for new building creation
        setFormData(getInitialFormData());
      }

      // Call onSuccess to refresh data
      onSuccess();

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (error: any) {
      setError(error.message || 'Erreur lors de la sauvegarde du bâtiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTechnicalElementChange = (element: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      technical_elements: {
        ...prev.technical_elements,
        [element]: value,
      },
    }));
  };

  const handleCheckboxChange = (element: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const currentValues = Array.isArray(prev.technical_elements[element as keyof typeof prev.technical_elements]) 
        ? prev.technical_elements[element as keyof typeof prev.technical_elements] as string[]
        : [];
      const newValues = checked
        ? [...currentValues, option]
        : currentValues.filter(v => v !== option);
      
      return {
        ...prev,
        technical_elements: {
          ...prev.technical_elements,
          [element]: newValues,
        },
      };
    });
  };

  const handleMiscellaneousChange = (option: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      miscellaneous_elements: checked
        ? [...prev.miscellaneous_elements, option]
        : prev.miscellaneous_elements.filter(item => item !== option),
    }));
  };

  const calculateDepreciatedValue = (): number => {
    const newValue = parseFloat(formData.new_value_mad) || 0;
    const obsolescence = parseFloat(formData.obsolescence_percentage) || 0;
    return newValue * (obsolescence / 100);
  };

  const calculateTotalArea = (): number => {
    const basement = parseFloat(formData.basement_area_sqm) || 0;
    const ground = parseFloat(formData.ground_floor_area_sqm) || 0;
    const first = parseFloat(formData.first_floor_area_sqm) || 0;
    return basement + ground + first;
  };

  const renderMultipleChoiceField = (
    title: string,
    element: string,
    options: string[]
  ) => (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-gray-700">{title}</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(formData.technical_elements[element as keyof typeof formData.technical_elements] as string[])?.includes(option) || false}
              onChange={(e) => handleCheckboxChange(element, option, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

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
          <Building2 className="mr-2" size={18} />
          Informations de base
        </h4>
        <Input
          label="Désignation du bâtiment *"
          type="text"
          name="designation"
          value={formData.designation}
          onChange={handleChange}
          placeholder="Nom du bâtiment"
          required
        />
      </div>

      {/* Section 2: Surface développée */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Surface développée (m²)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Sous-sol"
            type="number"
            name="basement_area_sqm"
            value={formData.basement_area_sqm}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="0.01"
          />
          <Input
            label="RDC"
            type="number"
            name="ground_floor_area_sqm"
            value={formData.ground_floor_area_sqm}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="0.01"
          />
          <Input
            label="1er étage"
            type="number"
            name="first_floor_area_sqm"
            value={formData.first_floor_area_sqm}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        
        {/* Surface totale calculée */}
        <div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Surface totale :</span>
            <span className="text-lg font-bold text-blue-700">
              {calculateTotalArea().toFixed(2)} m²
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Éléments techniques */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-6">Éléments techniques</h4>
        
        {/* Contiguïté et Communication */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Contiguïté</h5>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="contiguity"
                  value="neant"
                  checked={formData.contiguity === 'neant'}
                  onChange={handleChange}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Néant</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="contiguity"
                  value="oui"
                  checked={formData.contiguity === 'oui'}
                  onChange={handleChange}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Oui</span>
              </label>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Communication</h5>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="communication"
                  value="neant"
                  checked={formData.communication === 'neant'}
                  onChange={handleChange}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Néant</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="communication"
                  value="oui"
                  checked={formData.communication === 'oui'}
                  onChange={handleChange}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Oui</span>
              </label>
            </div>
          </div>
        </div>

        {/* Éléments techniques avec choix multiples */}
        <div className="space-y-6">
          {renderMultipleChoiceField('Semelles', 'semelles', technicalOptions.semelles)}
          
          {/* Élévations - choix multiples */}
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Élévations en agglomérés avec enduits</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {technicalOptions.elevations.map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.technical_elements.elevations) && formData.technical_elements.elevations.includes(option)}
                    onChange={(e) => handleCheckboxChange('elevations', option, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {renderMultipleChoiceField('Ossature', 'ossature', technicalOptions.ossature)}
          {renderMultipleChoiceField('Portes', 'portes', technicalOptions.portes)}
          {renderMultipleChoiceField('Fenêtres', 'fenetres', technicalOptions.fenetres)}
          {renderMultipleChoiceField('Grillage', 'grillage', technicalOptions.grillage)}
          {renderMultipleChoiceField('Façade', 'facade', technicalOptions.facade)}
          {renderMultipleChoiceField('Toiture', 'toiture', technicalOptions.toiture)}
          {renderMultipleChoiceField('Sol', 'sol', technicalOptions.sol)}
          {renderMultipleChoiceField('Plafond', 'plafond', technicalOptions.plafond)}
          {renderMultipleChoiceField('Escalier', 'escalier', technicalOptions.escalier)}
          {renderMultipleChoiceField('Cloisonnement', 'cloisonnement', technicalOptions.cloisonnement)}
        </div>
      </div>

      {/* Section 4: Éléments divers */}
      <div className="bg-amber-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Éléments divers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {miscellaneousOptions.map((option) => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.miscellaneous_elements.includes(option)}
                onChange={(e) => handleMiscellaneousChange(option, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
        
        {formData.miscellaneous_elements.length > 0 && (
          <div className="mt-4 p-3 bg-white border border-amber-200 rounded-lg">
            <p className="text-sm text-gray-600">
              {formData.miscellaneous_elements.length} élément{formData.miscellaneous_elements.length > 1 ? 's' : ''} sélectionné{formData.miscellaneous_elements.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Section 5: Valeurs financières */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator className="mr-2" size={18} />
          Valeurs financières
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Valeur à neuf du bâtiment (MAD)"
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

        {/* Valeur vétusté déduite calculée */}
        {formData.new_value_mad && (
          <div className="mt-4 p-3 bg-white border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Valeur vétusté déduite :</span>
              <span className="text-lg font-bold text-purple-700">
                {calculateDepreciatedValue().toFixed(2)} MAD
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Calcul : {formData.new_value_mad} × {formData.obsolescence_percentage}% = {calculateDepreciatedValue().toFixed(2)} MAD
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          {building ? 'Mettre à jour' : 'Ajouter le bâtiment'}
        </Button>
      </div>
    </form>
  );
};