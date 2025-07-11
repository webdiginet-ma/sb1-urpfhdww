import { jsPDF } from 'jspdf';
import { Mission, Building, Material, User } from '../types/auth';

interface MissionWithDetails extends Mission {
  assigned_user?: User;
  created_user?: User;
  mission_buildings?: Array<{
    building_id: string;
    buildings: Building;
  }>;
  materials?: Material[];
}

// Configuration PDF optimisée pour éviter les chevauchements
const PDF_CONFIG = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  margins: {
    top: 25,
    bottom: 25,
    left: 20,
    right: 20
  },
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
  lineHeight: 6, // Augmenté pour plus d'espacement
  fontSize: {
    h1: 20,      // H1 (très grand, centré, gras)
    h2: 16,      // H2 (grand, centré)
    h3: 14,      // H3 (moyen, aligné à gauche, gras)
    h4: 12,      // H4 (petit, gras)
    p: 10,       // Texte courant
    small: 8     // Petit texte
  },
  spacing: {
    beforeH1: 0,
    afterH1: 15,    // Plus d'espace après H1
    beforeH2: 8,
    afterH2: 10,    // Plus d'espace après H2
    beforeH3: 12,   // Plus d'espace avant H3
    afterH3: 8,     // Plus d'espace après H3
    beforeH4: 8,    // Plus d'espace avant H4
    afterH4: 5,     // Plus d'espace après H4
    afterParagraph: 4,
    betweenBuildings: 12, // Plus d'espace entre bâtiments
    betweenMaterials: 8,
    tableRowHeight: 7,    // Hauteur des lignes de tableau
    sectionSeparator: 15  // Espace entre sections principales
  }
};

// Fonction pour formater les nombres avec séparateurs de milliers
const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  // Utiliser toLocaleString avec les paramètres français pour un formatage propre
  return numValue.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

// Fonction pour formater les valeurs monétaires
const formatCurrency = (value: number | string | null | undefined, currency: string = 'MAD'): string => {
  const formattedNumber = formatNumber(value);
  return `${formattedNumber} ${currency}`;
};

// Fonction pour créer un slug à partir du titre de mission
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Fonction pour capitaliser la première lettre
const capitalizeFirstLetter = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Fonction pour calculer la largeur du contenu
const getContentWidth = (): number => {
  return PDF_CONFIG.pageWidth - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right;
};

// Fonction pour ajouter une nouvelle page si nécessaire avec marge de sécurité
const checkPageBreak = (pdf: jsPDF, currentY: number, requiredHeight: number): number => {
  const maxY = PDF_CONFIG.pageHeight - PDF_CONFIG.margins.bottom - 20; // Plus de marge de sécurité
  
  if (currentY + requiredHeight > maxY) {
    pdf.addPage();
    return PDF_CONFIG.margins.top;
  }
  
  return currentY;
};

// Fonction pour ajouter du texte avec retour à la ligne automatique et contrôle précis
const addWrappedText = (
  pdf: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  fontSize: number = PDF_CONFIG.fontSize.p,
  fontStyle: 'normal' | 'bold' | 'italic' = 'normal'
): number => {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', fontStyle);
  
  const lines = pdf.splitTextToSize(text, maxWidth);
  let currentY = y;
  
  lines.forEach((line: string) => {
    currentY = checkPageBreak(pdf, currentY, PDF_CONFIG.lineHeight + 2);
    pdf.text(line, x, currentY);
    currentY += PDF_CONFIG.lineHeight;
  });
  
  return currentY;
};

// Fonction pour ajouter un tableau avec espacement contrôlé
const addTable = (
  pdf: jsPDF,
  data: Array<[string, string]>,
  startY: number
): number => {
  let currentY = startY;
  const contentWidth = getContentWidth();
  const labelWidth = contentWidth * 0.4; // 40% pour le label
  const valueWidth = contentWidth * 0.6; // 60% pour la valeur
  
  data.forEach(([label, value]) => {
    if (label && value) {
      // Vérifier si on a besoin d'une nouvelle page
      currentY = checkPageBreak(pdf, currentY, PDF_CONFIG.spacing.tableRowHeight);
      
      // Label (gras)
      pdf.setFontSize(PDF_CONFIG.fontSize.p);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, PDF_CONFIG.margins.left, currentY);
      
      // Valeur (normal) - avec retour à la ligne si nécessaire
      pdf.setFont('helvetica', 'normal');
      const wrappedValue = pdf.splitTextToSize(value, valueWidth);
      
      let valueY = currentY;
      wrappedValue.forEach((line: string) => {
        pdf.text(line, PDF_CONFIG.margins.left + labelWidth, valueY);
        valueY += PDF_CONFIG.lineHeight;
      });
      
      currentY = Math.max(currentY + PDF_CONFIG.spacing.tableRowHeight, valueY);
    }
  });
  
  return currentY + PDF_CONFIG.spacing.afterParagraph;
};

// Fonction pour ajouter un titre H3 avec contrôle précis de l'espacement
const addH3Section = (
  pdf: jsPDF,
  title: string,
  currentY: number
): number => {
  // Espacement avant H3 avec vérification de page
  currentY += PDF_CONFIG.spacing.beforeH3;
  currentY = checkPageBreak(pdf, currentY, PDF_CONFIG.fontSize.h3 + PDF_CONFIG.spacing.afterH3 + 10);
  
  // Titre H3
  pdf.setFontSize(PDF_CONFIG.fontSize.h3);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, PDF_CONFIG.margins.left, currentY);
  
  // Ligne sous le titre avec espacement contrôlé
  const lineY = currentY + 3;
  pdf.setLineWidth(0.5);
  pdf.line(
    PDF_CONFIG.margins.left, 
    lineY, 
    PDF_CONFIG.pageWidth - PDF_CONFIG.margins.right, 
    lineY
  );
  
  return currentY + PDF_CONFIG.spacing.afterH3;
};

// Fonction pour ajouter un sous-titre H4 avec espacement contrôlé
const addH4SubSection = (
  pdf: jsPDF,
  title: string,
  currentY: number
): number => {
  // Espacement avant H4
  currentY += PDF_CONFIG.spacing.beforeH4;
  currentY = checkPageBreak(pdf, currentY, PDF_CONFIG.fontSize.h4 + PDF_CONFIG.spacing.afterH4 + 5);
  
  // Sous-titre H4
  pdf.setFontSize(PDF_CONFIG.fontSize.h4);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, PDF_CONFIG.margins.left, currentY);
  
  return currentY + PDF_CONFIG.spacing.afterH4;
};

// Fonctions utilitaires pour l'affichage
const getTechnicalElementDisplayName = (key: string): string => {
  const displayNames: { [key: string]: string } = {
    semelles: 'Semelles',
    elevations: 'Élévations',
    ossature: 'Ossature',
    portes: 'Portes',
    fenetres: 'Fenêtres',
    grillage: 'Grillage',
    facade: 'Façade',
    toiture: 'Toiture',
    sol: 'Sol',
    plafond: 'Plafond',
    escalier: 'Escalier',
    cloisonnement: 'Cloisonnement'
  };
  return displayNames[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
};

const getConditionDisplayName = (condition: string): string => {
  switch (condition) {
    case 'bon': return 'Bon';
    case 'acceptable': return 'Acceptable';
    case 'vetuste': return 'Vétuste';
    default: return condition;
  }
};

const getMaterialStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'operational': return 'Opérationnel';
    case 'maintenance': return 'En maintenance';
    case 'out_of_order': return 'Hors service';
    case 'retired': return 'Retiré';
    default: return status;
  }
};

const getMissionTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'inspection': return 'Inspection';
    case 'maintenance': return 'Maintenance';
    case 'audit': return 'Audit';
    case 'emergency': return 'Urgence';
    default: return type;
  }
};

const getPriorityDisplayName = (priority: string): string => {
  switch (priority) {
    case 'low': return 'Faible';
    case 'medium': return 'Moyenne';
    case 'high': return 'Élevée';
    case 'urgent': return 'Urgente';
    default: return priority;
  }
};

const getStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'draft': return 'Brouillon';
    case 'assigned': return 'Assignée';
    case 'in_progress': return 'En cours';
    case 'completed': return 'Terminée';
    case 'cancelled': return 'Annulée';
    default: return status;
  }
};

export const generateMissionReportPdf = async (mission: MissionWithDetails): Promise<void> => {
  return generateMissionReportPdfBlob(mission).then(blob => {
    // Générer le nom du fichier : rapport_{{mission.slug}}.pdf
    const slug = createSlug(mission.title);
    const fileName = `rapport_${slug}.pdf`;
    
    // Créer un lien de téléchargement et le déclencher
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

// Nouvelle fonction qui retourne le PDF sous forme de Blob
export const generateMissionReportPdfBlob = async (mission: MissionWithDetails): Promise<Blob> => {
  try {
    // Créer le document PDF avec compression
    const pdf = new jsPDF({
      orientation: PDF_CONFIG.orientation,
      unit: PDF_CONFIG.unit,
      format: PDF_CONFIG.format,
      compress: true
    });

    // Calculer les données
    const buildings = mission.mission_buildings?.map(mb => mb.buildings).filter(Boolean) || [];
    const materials = mission.materials || [];
    const materialsByBuilding: { [key: string]: Material[] } = {};
    
    materials.forEach(material => {
      if (material.building_id) {
        if (!materialsByBuilding[material.building_id]) {
          materialsByBuilding[material.building_id] = [];
        }
        materialsByBuilding[material.building_id].push(material);
      }
    });

    let currentY = PDF_CONFIG.margins.top;

    // PAGE 1 - En-tête du rapport avec espacement contrôlé
    
    // H1 - RAPPORT DE MISSION (très grand, centré, gras)
    pdf.setFontSize(PDF_CONFIG.fontSize.h1);
    pdf.setFont('helvetica', 'bold');
    const h1Text = 'RAPPORT DE MISSION';
    const h1Width = pdf.getTextWidth(h1Text);
    pdf.text(h1Text, (PDF_CONFIG.pageWidth - h1Width) / 2, currentY);
    currentY += PDF_CONFIG.spacing.afterH1;

    // H2 - Nom de la mission (grand, centré, première lettre en majuscule)
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont('helvetica', 'bold');
    const missionTitle = capitalizeFirstLetter(mission.title);
    const h2Width = pdf.getTextWidth(missionTitle);
    pdf.text(missionTitle, (PDF_CONFIG.pageWidth - h2Width) / 2, currentY);
    currentY += PDF_CONFIG.spacing.afterH2;

    // Horodatage de génération (petit italique sous le H2, centré)
    pdf.setFontSize(PDF_CONFIG.fontSize.small);
    pdf.setFont('helvetica', 'italic');
    const timestampText = `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
    const timestampWidth = pdf.getTextWidth(timestampText);
    pdf.text(timestampText, (PDF_CONFIG.pageWidth - timestampWidth) / 2, currentY);
    currentY += PDF_CONFIG.spacing.sectionSeparator;

    // H3 - INFORMATIONS PRINCIPALES avec espacement contrôlé
    currentY = addH3Section(pdf, 'INFORMATIONS PRINCIPALES', currentY);

    // Table des informations principales simplifiée (seulement les champs essentiels)
    const missionData: Array<[string, string]> = [
      ['Nom de la mission:', capitalizeFirstLetter(mission.title)],
      ['Type de mission:', getMissionTypeDisplayName(mission.mission_type)],
      ['Date de la mission:', mission.scheduled_start_date ? new Date(mission.scheduled_start_date).toLocaleDateString('fr-FR') : 'Non définie']
    ];

    currentY = addTable(pdf, missionData, currentY);

    // Section Description (si présente)
    if (mission.description) {
      currentY += PDF_CONFIG.spacing.sectionSeparator;
      currentY = addH3Section(pdf, 'DESCRIPTION', currentY);
      currentY = addWrappedText(
        pdf, 
        mission.description, 
        PDF_CONFIG.margins.left, 
        currentY, 
        getContentWidth(),
        PDF_CONFIG.fontSize.p
      ) + PDF_CONFIG.spacing.afterParagraph;
    }

    // Section Instructions (si présentes)
    if (mission.instructions) {
      currentY += PDF_CONFIG.spacing.sectionSeparator;
      currentY = addH3Section(pdf, 'INSTRUCTIONS SPÉCIALES', currentY);
      currentY = addWrappedText(
        pdf, 
        mission.instructions, 
        PDF_CONFIG.margins.left, 
        currentY, 
        getContentWidth(),
        PDF_CONFIG.fontSize.p
      ) + PDF_CONFIG.spacing.afterParagraph;
    }

    // Section Plan de masse (inclure le(s) fichier(s) listés juste après les infos principales)
    if (mission.plan_de_masse_filename) {
      currentY += PDF_CONFIG.spacing.sectionSeparator;
      currentY = addH3Section(pdf, 'PLAN DE MASSE', currentY);
      
      const planData: Array<[string, string]> = [
        ['Nom du fichier:', mission.plan_de_masse_filename],
        ['Taille:', mission.plan_de_masse_size ? `${(mission.plan_de_masse_size / 1024 / 1024).toFixed(2)} MB` : 'Non spécifiée'],
        ['Date d\'upload:', mission.plan_de_masse_uploaded_at ? new Date(mission.plan_de_masse_uploaded_at).toLocaleDateString('fr-FR') : 'Non spécifiée']
      ];
      currentY = addTable(pdf, planData, currentY);
    }

    // Forcer un saut de page avant la section Bâtiments
    pdf.addPage();
    currentY = PDF_CONFIG.margins.top;

    // SECTION BÂTIMENTS (nouvelle page)
    currentY = addH3Section(pdf, `BÂTIMENTS (${buildings.length})`, currentY);
    
    if (buildings.length === 0) {
      currentY = addWrappedText(
        pdf, 
        'Aucun bâtiment associé à cette mission.', 
        PDF_CONFIG.margins.left, 
        currentY, 
        getContentWidth(),
        PDF_CONFIG.fontSize.p
      ) + PDF_CONFIG.spacing.afterParagraph;
    } else {
      buildings.forEach((building, index) => {
        // Vérifier si on a assez de place pour le bâtiment (estimation)
        currentY = checkPageBreak(pdf, currentY, 50);
        
        // H4 - #{{index}} – {{designation}}
        currentY = addH4SubSection(pdf, `#${index + 1} – ${building.designation}`, currentY);

        // Sous-section H4 : Informations générales
        currentY = addH4SubSection(pdf, 'Informations générales', currentY);
        const generalData: Array<[string, string]> = [
          ['Désignation:', building.designation],
          ['Statut:', building.is_active ? 'Actif' : 'Inactif'],
          ['Créé le:', new Date(building.created_at).toLocaleDateString('fr-FR')],
          ['Dernière mise à jour:', new Date(building.updated_at).toLocaleDateString('fr-FR')]
        ];
        currentY = addTable(pdf, generalData, currentY);

        // Sous-section H4 : Surfaces développées
        const surfaceData: Array<[string, string]> = [];
        if (building.basement_area_sqm !== undefined && building.basement_area_sqm !== null) {
          surfaceData.push(['Surface sous-sol:', `${formatNumber(building.basement_area_sqm)} m²`]);
        }
        if (building.ground_floor_area_sqm !== undefined && building.ground_floor_area_sqm !== null) {
          surfaceData.push(['Surface RDC:', `${formatNumber(building.ground_floor_area_sqm)} m²`]);
        }
        if (building.first_floor_area_sqm !== undefined && building.first_floor_area_sqm !== null) {
          surfaceData.push(['Surface 1er étage:', `${formatNumber(building.first_floor_area_sqm)} m²`]);
        }
        if (building.total_area) {
          surfaceData.push(['Surface totale:', `${formatNumber(building.total_area)} m²`]);
        }

        if (surfaceData.length > 0) {
          currentY = addH4SubSection(pdf, 'Surfaces développées', currentY);
          currentY = addTable(pdf, surfaceData, currentY);
        }

        // Propriétés du bâtiment
        const propertyData: Array<[string, string]> = [];
        if (building.contiguity && building.contiguity !== 'neant') {
          propertyData.push(['Contiguïté:', building.contiguity]);
        }
        if (building.communication && building.communication !== 'neant') {
          propertyData.push(['Communication:', building.communication]);
        }

        if (propertyData.length > 0) {
          currentY = addH4SubSection(pdf, 'Propriétés', currentY);
          currentY = addTable(pdf, propertyData, currentY);
        }

        // Sous-section H4 : Valeurs financières (avec formatage corrigé)
        const financialData: Array<[string, string]> = [];
        if (building.new_value_mad) {
          financialData.push(['Valeur à neuf:', formatCurrency(building.new_value_mad)]);
        }
        if (building.obsolescence_percentage !== undefined && building.obsolescence_percentage !== null) {
          financialData.push(['Pourcentage de vétusté:', `${formatNumber(building.obsolescence_percentage)}%`]);
        }
        if (building.depreciated_value_mad) {
          financialData.push(['Valeur vétustée déduite:', formatCurrency(building.depreciated_value_mad)]);
        }

        if (financialData.length > 0) {
          currentY = addH4SubSection(pdf, 'Valeurs financières', currentY);
          currentY = addTable(pdf, financialData, currentY);
        }

        // Sous-section H4 : Éléments techniques
        if (building.technical_elements && Object.keys(building.technical_elements).length > 0) {
          currentY = addH4SubSection(pdf, 'Éléments techniques', currentY);

          Object.entries(building.technical_elements).forEach(([key, value]) => {
            const displayName = getTechnicalElementDisplayName(key);
            if (Array.isArray(value) && value.length > 0) {
              currentY = addWrappedText(
                pdf, 
                `• ${displayName}: ${value.join(', ')}`, 
                PDF_CONFIG.margins.left + 5, 
                currentY, 
                getContentWidth() - 5,
                PDF_CONFIG.fontSize.p
              );
            } else if (typeof value === 'string' && value.trim() !== '') {
              currentY = addWrappedText(
                pdf, 
                `• ${displayName}: ${value}`, 
                PDF_CONFIG.margins.left + 5, 
                currentY, 
                getContentWidth() - 5,
                PDF_CONFIG.fontSize.p
              );
            }
          });
          currentY += PDF_CONFIG.spacing.afterParagraph;
        }

        // Éléments divers
        if (building.miscellaneous_elements && Array.isArray(building.miscellaneous_elements) && building.miscellaneous_elements.length > 0) {
          currentY = addH4SubSection(pdf, `Éléments divers (${building.miscellaneous_elements.length} éléments)`, currentY);

          building.miscellaneous_elements.forEach((item, itemIndex) => {
            currentY = addWrappedText(
              pdf, 
              `${itemIndex + 1}. ${item}`, 
              PDF_CONFIG.margins.left + 5, 
              currentY, 
              getContentWidth() - 5,
              PDF_CONFIG.fontSize.p
            );
          });
          currentY += PDF_CONFIG.spacing.afterParagraph;
        }

        // Laisser plus d'espace entre deux bâtiments pour éviter le chevauchement
        if (index < buildings.length - 1) {
          currentY += PDF_CONFIG.spacing.betweenBuildings;
        }
      });
    }

    // SECTION MATÉRIELS (nouvelle page si nécessaire)
    currentY = checkPageBreak(pdf, currentY, 40); // Réserver plus d'espace pour le titre
    
    currentY += PDF_CONFIG.spacing.sectionSeparator;
    currentY = addH3Section(pdf, `MATÉRIELS (${materials.length})`, currentY);
    
    if (materials.length === 0) {
      currentY = addWrappedText(
        pdf, 
        'Aucun matériel associé à cette mission.', 
        PDF_CONFIG.margins.left, 
        currentY, 
        getContentWidth(),
        PDF_CONFIG.fontSize.p
      ) + PDF_CONFIG.spacing.afterParagraph;
    } else {
      // Regrouper par bâtiment
      buildings.forEach((building, buildingIndex) => {
        const buildingMaterials = materialsByBuilding[building.id];
        if (buildingMaterials && buildingMaterials.length > 0) {
          // Vérifier si on a assez de place pour cette section
          currentY = checkPageBreak(pdf, currentY, 30);
          
          // Sous-titre H4 : Matériels pour : {{nom_batiment}} ({{count}})
          currentY = addH4SubSection(pdf, `Matériels pour : ${building.designation} (${buildingMaterials.length})`, currentY);

          buildingMaterials.forEach((material, materialIndex) => {
            // Vérifier si on a assez de place pour ce matériel
            currentY = checkPageBreak(pdf, currentY, 40);
            
            // H4 - #{{index}} – {{designation}}
            currentY = addH4SubSection(pdf, `#${materialIndex + 1} – ${material.name}`, currentY);

            // Sous-sections : Informations de base
            currentY = addH4SubSection(pdf, 'Informations de base', currentY);
            const basicData: Array<[string, string]> = [
              ['Désignation:', material.name],
              ['Catégorie:', material.category || 'Non spécifiée'],
              ['Localisation (bâtiment):', building.designation],
              ['Statut:', material.is_active ? 'Actif' : 'Inactif'],
              ['Créé le:', new Date(material.created_at).toLocaleDateString('fr-FR')],
              ['Dernière mise à jour:', new Date(material.updated_at).toLocaleDateString('fr-FR')]
            ];
            currentY = addTable(pdf, basicData, currentY);

            // Sous-sections : Détails techniques
            const technicalData: Array<[string, string]> = [];
            if (material.brand) technicalData.push(['Marque:', material.brand]);
            if (material.model) technicalData.push(['Modèle:', material.model]);
            if (material.serial_number) technicalData.push(['Numéro de série:', material.serial_number]);
            if (material.quantity !== undefined && material.quantity !== null) {
              technicalData.push(['Quantité:', formatNumber(material.quantity)]);
            }
            if (material.manufacturing_year !== undefined && material.manufacturing_year !== null) {
              technicalData.push(['Année de fabrication:', formatNumber(material.manufacturing_year)]);
            }

            if (technicalData.length > 0) {
              currentY = addH4SubSection(pdf, 'Détails techniques', currentY);
              currentY = addTable(pdf, technicalData, currentY);
            }

            // Sous-sections : État et statut
            const statusData: Array<[string, string]> = [];
            if (material.condition) statusData.push(['État du matériel:', getConditionDisplayName(material.condition)]);
            if (material.status) statusData.push(['Statut opérationnel:', getMaterialStatusDisplayName(material.status)]);

            if (statusData.length > 0) {
              currentY = addH4SubSection(pdf, 'État et statut', currentY);
              currentY = addTable(pdf, statusData, currentY);
            }

            // Valeurs financières (avec formatage corrigé)
            const financialData: Array<[string, string]> = [];
            if (material.new_value_mad) {
              financialData.push(['Valeur à neuf:', formatCurrency(material.new_value_mad)]);
            }
            if (material.obsolescence_percentage !== undefined && material.obsolescence_percentage !== null && material.obsolescence_percentage > 0) {
              financialData.push(['Pourcentage de vétusté:', `${formatNumber(material.obsolescence_percentage)}%`]);
            }
            if (material.depreciated_value_mad) {
              financialData.push(['Valeur après vétusté:', formatCurrency(material.depreciated_value_mad)]);
            }

            if (financialData.length > 0) {
              currentY = addH4SubSection(pdf, 'Valeurs financières', currentY);
              currentY = addTable(pdf, financialData, currentY);
            }

            // Dates importantes
            const dateData: Array<[string, string]> = [];
            if (material.installation_date) {
              dateData.push(['Date d\'installation:', new Date(material.installation_date).toLocaleDateString('fr-FR')]);
            }
            if (material.warranty_end_date) {
              const warrantyDate = new Date(material.warranty_end_date);
              const isExpired = warrantyDate < new Date();
              dateData.push(['Fin de garantie:', `${warrantyDate.toLocaleDateString('fr-FR')} ${isExpired ? '(EXPIRÉE)' : '(ACTIVE)'}`]);
            }

            if (dateData.length > 0) {
              currentY = addH4SubSection(pdf, 'Dates importantes', currentY);
              currentY = addTable(pdf, dateData, currentY);
            }

            // Localisation et notes
            const locationData: Array<[string, string]> = [];
            if (material.location_details) {
              locationData.push(['Localisation détaillée:', material.location_details]);
            }
            if (material.maintenance_notes) {
              locationData.push(['Notes de maintenance:', material.maintenance_notes]);
            }

            if (locationData.length > 0) {
              currentY = addH4SubSection(pdf, 'Localisation et notes', currentY);
              currentY = addTable(pdf, locationData, currentY);
            }

            // Spécifications techniques (si présentes)
            if (material.specifications && typeof material.specifications === 'object') {
              currentY = addH4SubSection(pdf, 'Spécifications techniques', currentY);

              Object.entries(material.specifications).forEach(([key, value]) => {
                if (value) {
                  currentY = addWrappedText(
                    pdf, 
                    `• ${key}: ${value}`, 
                    PDF_CONFIG.margins.left + 5, 
                    currentY, 
                    getContentWidth() - 5,
                    PDF_CONFIG.fontSize.p
                  );
                }
              });
              currentY += PDF_CONFIG.spacing.afterParagraph;
            }
            
            // Espacement entre matériels
            if (materialIndex < buildingMaterials.length - 1) {
              currentY += PDF_CONFIG.spacing.betweenMaterials;
            }
          });

          // Espacement entre bâtiments
          if (buildingIndex < buildings.length - 1) {
            currentY += PDF_CONFIG.spacing.betweenBuildings;
          }
        }
      });
    }

    // Section Rapport de mission (si présent)
    if (mission.report) {
      currentY += PDF_CONFIG.spacing.sectionSeparator;
      currentY = addH3Section(pdf, 'RAPPORT DE MISSION', currentY);
      currentY = addWrappedText(
        pdf, 
        mission.report, 
        PDF_CONFIG.margins.left, 
        currentY, 
        getContentWidth(),
        PDF_CONFIG.fontSize.p
      ) + PDF_CONFIG.spacing.afterParagraph;
    }

    // H3 - RÉSUMÉ STATISTIQUE
    currentY += PDF_CONFIG.spacing.sectionSeparator;
    currentY = addH3Section(pdf, 'RÉSUMÉ STATISTIQUE', currentY);
    
    const totalBuildings = buildings.length;
    const totalMaterials = materials.length;
    const totalSurface = buildings.reduce((sum, building) => sum + (building.total_area || 0), 0);
    const totalValueNeuf = buildings.reduce((sum, building) => sum + (building.new_value_mad || 0), 0) +
                          materials.reduce((sum, material) => sum + (material.new_value_mad || 0), 0);
    const totalValueVetuste = buildings.reduce((sum, building) => sum + (building.depreciated_value_mad || 0), 0) +
                             materials.reduce((sum, material) => sum + (material.depreciated_value_mad || 0), 0);

    const summaryData: Array<[string, string]> = [
      ['Nombre total de bâtiments:', formatNumber(totalBuildings)],
      ['Nombre total de matériels:', formatNumber(totalMaterials)],
      ['Surface totale des bâtiments:', `${formatNumber(totalSurface)} m²`],
      ['Valeur totale à neuf:', formatCurrency(totalValueNeuf)],
      ['Valeur totale après vétusté:', formatCurrency(totalValueVetuste)],
      ['Différence (vétusté):', formatCurrency(totalValueNeuf - totalValueVetuste)]
    ];

    currentY = addTable(pdf, summaryData, currentY);

    // En-tête / pied de page : numéro de page centré (« Page {{current}} / {{total}} »)
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(PDF_CONFIG.fontSize.small);
      pdf.setFont('helvetica', 'normal');
      
      // Numéro de page centré
      pdf.text(
        `Page ${i} / ${totalPages}`, 
        PDF_CONFIG.pageWidth / 2, 
        PDF_CONFIG.pageHeight - 10, 
        { align: 'center' }
      );
      
      // Informations de génération sur la dernière page
      if (i === totalPages) {
        const footerText = `Rapport automatiquement par le système de gestion des missions`;
        const dateText = `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
        
        pdf.text(
          footerText, 
          PDF_CONFIG.pageWidth / 2, 
          PDF_CONFIG.pageHeight - 5, 
          { align: 'center' }
        );
        pdf.text(
          dateText, 
          PDF_CONFIG.pageWidth / 2, 
          PDF_CONFIG.pageHeight - 2, 
          { align: 'center' }
        );
      }
    }

    // Retourner le PDF sous forme de Blob au lieu de le sauvegarder
    return pdf.output('blob');

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Erreur lors de la génération du rapport PDF');
  }
}