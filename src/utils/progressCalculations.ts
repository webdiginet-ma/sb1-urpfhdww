/**
 * Utility functions for calculating progress and completion percentages
 * for buildings, materials, and overall mission progress
 */

import { Building, Material } from '../types/auth';

/**
 * Calculate the completion percentage of a building based on filled fields
 * Updated to count each technical element and miscellaneous element individually
 */
export const calculateBuildingProgress = (building: Building): number => {
  let progress = 0;
  let totalFields = 0;

  // 1. Basic information (designation is required, so always counts)
  totalFields += 1;
  if (building.designation) progress += 1;

  // 2. Surface areas (3 fields)
  totalFields += 3;
  if (building.basement_area_sqm !== undefined && building.basement_area_sqm !== null) progress += 1;
  if (building.ground_floor_area_sqm !== undefined && building.ground_floor_area_sqm !== null) progress += 1;
  if (building.first_floor_area_sqm !== undefined && building.first_floor_area_sqm !== null) progress += 1;

  // 3. Contiguity and communication (2 fields)
  totalFields += 2;
  if (building.contiguity) progress += 1; // 'neant' is a valid choice, so count it as filled
  if (building.communication) progress += 1; // 'neant' is a valid choice, so count it as filled

  // 4. Financial values (2 fields)
  totalFields += 2;
  if (building.new_value_mad !== undefined && building.new_value_mad !== null && building.new_value_mad > 0) progress += 1;
  if (building.obsolescence_percentage !== undefined && building.obsolescence_percentage !== null) progress += 1;

  // 5. Technical elements (count each element individually)
  // List of all possible technical elements based on the form
  const technicalElementKeys = [
    'semelles',
    'elevations', 
    'ossature',
    'portes',
    'fenetres',
    'grillage',
    'chassis',
    'facade',
    'toiture',
    'sol',
    'plafond',
    'escalier',
    'cloisonnement'
  ];

  technicalElementKeys.forEach(key => {
    totalFields += 1;
    
    if (building.technical_elements && building.technical_elements[key]) {
      const value = building.technical_elements[key];
      
      // Check if the value is filled
      if (Array.isArray(value)) {
        // For array values (like semelles, ossature, etc.)
        if (value.length > 0) progress += 1;
      } else if (typeof value === 'string') {
        // For string values (like elevations)
        if (value.trim().length > 0) progress += 1;
      }
    }
  });

  // 6. Miscellaneous elements (count each element individually)
  if (building.miscellaneous_elements && Array.isArray(building.miscellaneous_elements)) {
    // Each miscellaneous element counts as a separate field
    building.miscellaneous_elements.forEach(() => {
      totalFields += 1;
      progress += 1; // If it exists in the array, it's considered filled
    });
  }

  // Note: We don't add a separate field for "having miscellaneous elements" 
  // because each individual element is counted above

  return totalFields > 0 ? Math.round((progress / totalFields) * 100) : 0;
};

/**
 * Calculate the completion percentage of a material based on filled fields
 * Updated to match the exact fields shown in the material form
 */
export const calculateMaterialProgress = (material: Material): number => {
  let progress = 0;
  let totalFields = 0;

  // 1. Informations de base
  // Désignation * (required)
  totalFields += 1;
  if (material.name) progress += 1;

  // Bâtiment associé * (required) - building_id is always set when creating material
  totalFields += 1;
  if (material.building_id) progress += 1;

  // 2. Détails techniques
  // Marque
  totalFields += 1;
  if (material.brand) progress += 1;
  
  // Modèle
  totalFields += 1;
  if (material.model) progress += 1;
  
  // Quantité * (required)
  totalFields += 1;
  if (material.quantity !== undefined && material.quantity !== null && material.quantity > 0) progress += 1;
  
  // Numéro de série
  totalFields += 1;
  if (material.serial_number) progress += 1;
  
  // Année de fabrication
  totalFields += 1;
  if (material.manufacturing_year !== undefined && material.manufacturing_year !== null) progress += 1;

  // 3. État du matériel
  totalFields += 1;
  if (material.condition) progress += 1;

  // 4. Valeurs financières
  // Valeur à neuf (MAD)
  totalFields += 1;
  if (material.new_value_mad !== undefined && material.new_value_mad !== null && material.new_value_mad > 0) progress += 1;
  
  // Vétusté (%)
  totalFields += 1;
  if (material.obsolescence_percentage !== undefined && material.obsolescence_percentage !== null) progress += 1;

  // Note: Les champs suivants ne sont PAS inclus dans le calcul de progression :
  // - status (statut opérationnel)
  // - installation_date
  // - warranty_end_date  
  // - location_details
  // - maintenance_notes
  // - specifications

  return totalFields > 0 ? Math.round((progress / totalFields) * 100) : 0;
};

/**
 * Calculate the completion percentage of a material based on filled fields (OLD VERSION - REMOVED)
 * This is the old version that included extra fields not shown in the form
 */
export const calculateMaterialProgressOld = (material: Material): number => {
  let progress = 0;
  let totalFields = 0;

  // Basic information (name is required)
  totalFields += 1;
  if (material.name) progress += 1;

  // Technical details (5 fields)
  totalFields += 5;
  if (material.brand) progress += 1;
  if (material.model) progress += 1;
  if (material.serial_number) progress += 1;
  if (material.quantity !== undefined && material.quantity !== null && material.quantity > 0) progress += 1;
  if (material.manufacturing_year !== undefined && material.manufacturing_year !== null) progress += 1;

  // Condition and status
  totalFields += 2;
  if (material.condition) progress += 1;
  if (material.status) progress += 1;

  // Financial values (2 fields)
  totalFields += 2;
  if (material.new_value_mad !== undefined && material.new_value_mad !== null && material.new_value_mad > 0) progress += 1;
  if (material.obsolescence_percentage !== undefined && material.obsolescence_percentage !== null) progress += 1;

  // Dates and location (3 fields)
  totalFields += 3;
  if (material.installation_date) progress += 1;
  if (material.warranty_end_date) progress += 1;
  if (material.location_details) progress += 1;

  return totalFields > 0 ? Math.round((progress / totalFields) * 100) : 0;
};

/**
 * Calculate overall mission progress based on buildings and materials completion
 */
export const calculateOverallMissionProgress = (
  buildings: Building[],
  materials: Material[],
  missionStatus: string
): number => {
  // If mission is completed, return 100%
  if (missionStatus === 'completed') return 100;
  
  // If mission is cancelled, return 0%
  if (missionStatus === 'cancelled') return 0;

  // If no buildings and no materials, base on mission status
  if (buildings.length === 0 && materials.length === 0) {
    switch (missionStatus) {
      case 'draft': return 0;
      case 'assigned': return 15;
      case 'in_progress': return 50;
      default: return 0;
    }
  }

  let totalProgress = 0;
  let totalWeight = 0;

  // Buildings contribute 60% to overall progress
  if (buildings.length > 0) {
    const buildingsProgress = buildings.reduce((sum, building) => {
      return sum + calculateBuildingProgress(building);
    }, 0) / buildings.length;
    
    totalProgress += buildingsProgress * 0.6;
    totalWeight += 0.6;
  }

  // Materials contribute 40% to overall progress
  if (materials.length > 0) {
    const materialsProgress = materials.reduce((sum, material) => {
      return sum + calculateMaterialProgress(material);
    }, 0) / materials.length;
    
    totalProgress += materialsProgress * 0.4;
    totalWeight += 0.4;
  }

  // If only buildings or only materials exist, adjust the weight
  if (totalWeight > 0) {
    return Math.round(totalProgress / totalWeight);
  }

  return 0;
};

/**
 * Get validation status for buildings
 */
export const getBuildingsValidationStatus = (buildings: Building[]): { completed: number; total: number; status: string; color: string } => {
  if (buildings.length === 0) {
    return { completed: 0, total: 0, status: 'Aucun bâtiment', color: 'text-gray-600' };
  }

  const completed = buildings.filter(building => calculateBuildingProgress(building) >= 80).length;
  const total = buildings.length;
  
  if (completed === total) {
    return { completed, total, status: 'Validé', color: 'text-green-600' };
  } else if (completed > 0) {
    return { completed, total, status: 'Validation partielle', color: 'text-amber-600' };
  } else {
    return { completed, total, status: 'En attente', color: 'text-gray-600' };
  }
};

/**
 * Get validation status for materials
 */
export const getMaterialsValidationStatus = (materials: Material[]): { completed: number; total: number; status: string; color: string } => {
  if (materials.length === 0) {
    return { completed: 0, total: 0, status: 'Aucun matériel', color: 'text-gray-600' };
  }

  const completed = materials.filter(material => calculateMaterialProgress(material) >= 80).length;
  const total = materials.length;
  
  if (completed === total) {
    return { completed, total, status: 'Validé', color: 'text-green-600' };
  } else if (completed > 0) {
    return { completed, total, status: 'Validation partielle', color: 'text-amber-600' };
  } else {
    return { completed, total, status: 'En attente', color: 'text-gray-600' };
  }
};