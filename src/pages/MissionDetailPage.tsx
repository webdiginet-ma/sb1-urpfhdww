import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  ArrowLeft, 
  Calendar, 
  User, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MapPin,
  Edit,
  Trash2,
  UserCheck,
  Play,
  Pause,
  Square,
  FileText,
  Phone,
  Mail,
  Wrench,
  Eye,
  Download,
  Upload,
  X,
  FileDown,
  Share
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { ProgressBar } from '../components/ui/ProgressBar';
import { MissionBuildingsTab } from '../components/missions/MissionBuildingsTab';
import { MissionMaterialsTab } from '../components/missions/MissionMaterialsTab';
import { Mission, Building, Material, User as UserType } from '../types/auth';
import { 
  calculateOverallMissionProgress, 
  getBuildingsValidationStatus, 
  getMaterialsValidationStatus 
} from '../utils/progressCalculations';
import { generateMissionReportPdf, generateMissionReportPdfBlob } from '../utils/pdfGenerator';

// Fonction pour créer un slug à partir du titre de mission
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

interface MissionWithDetails extends Mission {
  assigned_user?: UserType;
  created_user?: UserType;
  mission_buildings?: Array<{
    building_id: string;
    buildings: Building;
  }>;
  materials?: Material[];
}

export const MissionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageMissions, isConstateur } = useRolePermissions();
  
  const [mission, setMission] = useState<MissionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // État pour persister l'onglet actif
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [generatedPdfPublicUrl, setGeneratedPdfPublicUrl] = useState<string | null>(null);

  // Plan de masse states
  const [planDeMasseFile, setPlanDeMasseFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMissionDetails();
    }
  }, [id]);

  const fetchMissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch mission with related data including plan de masse fields
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select(`
          *,
          assigned_user:assigned_to (
            id,
            full_name,
            email,
            phone
          ),
          created_user:created_by (
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (missionError) throw missionError;

      // Fetch mission buildings with updated schema
      const { data: missionBuildings, error: buildingsError } = await supabase
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
        .eq('mission_id', id);

      if (buildingsError) throw buildingsError;

      // Fetch materials for the mission buildings
      let materials: Material[] = [];
      if (missionBuildings && missionBuildings.length > 0) {
        const buildingIds = missionBuildings.map(mb => mb.building_id);
        
        const { data: materialsData, error: materialsError } = await supabase
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

        if (materialsError) {
          console.error('Error fetching materials:', materialsError);
        } else {
          materials = materialsData || [];
        }
      }

      setMission({
        ...missionData,
        mission_buildings: missionBuildings || [],
        materials: materials
      });
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour gérer la mise à jour des données et maintenir l'onglet actif
  const handleDataUpdate = async () => {
    await fetchMissionDetails();
    // L'onglet actif est maintenu grâce à l'état activeTab
  };

  // Fonction pour gérer le changement d'onglet
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Fonction pour générer le PDF
  const handleGeneratePdf = async () => {
    if (!mission || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setIsUploadingPdf(true);
    try {
      // Générer le PDF sous forme de Blob
      const pdfBlob = await generateMissionReportPdfBlob(mission);
      
      // Créer le nom du fichier
      const slug = createSlug(mission.title);
      const fileName = `rapport_${slug}_${Date.now()}.pdf`;
      const filePath = `missions/${mission.id}/reports/${fileName}`;
      
      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('mission-documents')
        .upload(filePath, pdfBlob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw new Error(`Erreur lors de l'upload: ${error.message}`);
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('mission-documents')
        .getPublicUrl(filePath);

      // Stocker l'URL publique pour le partage WhatsApp
      setGeneratedPdfPublicUrl(publicUrl);
      
      // Télécharger le PDF localement aussi
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      setError(error.message || 'Erreur lors de la génération du rapport PDF');
    } finally {
      setIsGeneratingPdf(false);
      setIsUploadingPdf(false);
    }
  };

  // Fonction pour partager via WhatsApp
  const handleShareWhatsApp = () => {
    if (!generatedPdfPublicUrl) {
      setError('Veuillez d\'abord générer le PDF avant de le partager');
      return;
    }

    const message = `Rapport de mission: ${mission?.title}\n\nConsultez le rapport complet: ${generatedPdfPublicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    // Ouvrir WhatsApp dans un nouvel onglet
    window.open(whatsappUrl, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Seuls les fichiers PDF, JPG et PNG sont autorisés pour le plan de masse.');
        return;
      }
      
      // Vérifier la taille du fichier (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setUploadError('Le fichier ne doit pas dépasser 10MB.');
        return;
      }
    }
    
    setPlanDeMasseFile(file);
    setUploadError(null);
  };

  const handleUploadPlanDeMasse = async () => {
    if (!planDeMasseFile || !mission) return;

    setUploadProgress(0);
    setUploadError(null);

    try {
      const fileExt = planDeMasseFile.name.split('.').pop();
      const fileName = `plan-de-masse.${fileExt}`;
      const filePath = `missions/${mission.id}/${fileName}`;

      // Upload or update file in Supabase Storage
      const { data, error } = await supabase.storage
        .from('mission-documents')
        .upload(filePath, planDeMasseFile, {
          cacheControl: '3600',
          upsert: true, // This allows updating existing files
        });

      if (error) {
        throw new Error(`Erreur lors de l'upload: ${error.message}`);
      }

      setUploadProgress(75);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mission-documents')
        .getPublicUrl(filePath);

      // Update mission with file information
      const { error: updateError } = await supabase
        .from('missions')
        .update({
          plan_de_masse_url: publicUrl,
          plan_de_masse_path: filePath,
          plan_de_masse_filename: planDeMasseFile.name,
          plan_de_masse_size: planDeMasseFile.size,
          plan_de_masse_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id);

      if (updateError) throw updateError;

      setUploadProgress(100);
      setPlanDeMasseFile(null);
      
      // Refresh mission data
      await fetchMissionDetails();

    } catch (error: any) {
      console.error('Erreur lors de l\'upload du plan de masse:', error);
      setUploadError(error.message || 'Erreur lors de l\'upload du plan de masse');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDownloadPlanDeMasse = async () => {
    if (!mission?.plan_de_masse_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('mission-documents')
        .download(mission.plan_de_masse_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = mission.plan_de_masse_filename || 'plan-de-masse';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('Erreur lors du téléchargement:', error);
      setUploadError(error.message || 'Erreur lors du téléchargement du plan de masse');
    }
  };

  const handleDeletePlanDeMasse = async () => {
    if (!mission?.plan_de_masse_path || !confirm('Êtes-vous sûr de vouloir supprimer le plan de masse ?')) {
      return;
    }

    try {
      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('mission-documents')
        .remove([mission.plan_de_masse_path]);

      if (deleteError) throw deleteError;

      // Update mission to remove file information
      const { error: updateError } = await supabase
        .from('missions')
        .update({
          plan_de_masse_url: null,
          plan_de_masse_path: null,
          plan_de_masse_filename: null,
          plan_de_masse_size: null,
          plan_de_masse_uploaded_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id);

      if (updateError) throw updateError;

      // Refresh mission data
      await fetchMissionDetails();

    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setUploadError(error.message || 'Erreur lors de la suppression du plan de masse');
    }
  };

  const handleStatusUpdate = async (newStatus: Mission['status']) => {
    if (!mission || isUpdating) return;

    setIsUpdating(true);
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add actual dates based on status
      if (newStatus === 'in_progress' && !mission.actual_start_date) {
        updates.actual_start_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'completed' && !mission.actual_end_date) {
        updates.actual_end_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', mission.id);

      if (error) throw error;

      setMission(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteMission = async () => {
    if (!mission || !confirm('Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.')) {
      return;
    }

    try {
      setError(null);
      
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', mission.id);

      if (error) throw error;

      navigate('/missions');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.message || 'Erreur lors de la suppression de la mission');
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

  const canUpdateStatus = () => {
    if (isConstateur) {
      return mission?.assigned_to === user?.id;
    }
    return canManageMissions;
  };

  const canEditMission = () => {
    return canManageMissions;
  };

  const canDeleteMission = () => {
    // Super admin et admin peuvent toujours supprimer
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      return true;
    }
    // Les experts peuvent supprimer leurs propres missions
    if (user?.role === 'expert' && mission?.created_by === user?.id) {
      return true;
    }
    return false;
  };

  const canDownloadPlanDeMasse = () => {
    // Experts et rôles supérieurs peuvent toujours télécharger
    if (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'expert') {
      return true;
    }
    // Constatateurs assignés peuvent télécharger
    if (user?.role === 'constateur' && mission?.assigned_to === user?.id) {
      return true;
    }
    return false;
  };

  const canGeneratePdf = () => {
    // Tous les utilisateurs authentifiés peuvent générer le PDF
    return !!user;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Mission non trouvée'}
        </div>
      </div>
    );
  }

  // Calculate real progress and validation status
  const buildings = mission.mission_buildings?.map(mb => mb.buildings).filter(Boolean) || [];
  const materials = mission.materials || [];
  const overallProgress = calculateOverallMissionProgress(buildings, materials, mission.status);
  const buildingsValidation = getBuildingsValidationStatus(buildings);
  const materialsValidation = getMaterialsValidationStatus(materials);

  // Contenu de l'onglet "Vue d'ensemble"
  const overviewContent = (
    <div className="space-y-8" id="rapport-mission">
      {/* Section Documents */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Document Plan de masse */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Plan de masse</h3>
                    <p className="text-sm text-gray-600">Document technique</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  mission.plan_de_masse_url ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {mission.plan_de_masse_url ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <X className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {mission.plan_de_masse_url ? (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Fichier:</strong> {mission.plan_de_masse_filename}</p>
                    {mission.plan_de_masse_size && (
                      <p><strong>Taille:</strong> {formatFileSize(mission.plan_de_masse_size)}</p>
                    )}
                    {mission.plan_de_masse_uploaded_at && (
                      <p><strong>Uploadé le:</strong> {new Date(mission.plan_de_masse_uploaded_at).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {canDownloadPlanDeMasse() && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={Download}
                        onClick={handleDownloadPlanDeMasse}
                      >
                        Télécharger
                      </Button>
                    )}
                    {canEditMission() && (
                      <Button 
                        variant="danger" 
                        size="sm" 
                        icon={Trash2}
                        onClick={handleDeletePlanDeMasse}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="text-sm mb-3">Aucun plan de masse</p>
                </div>
              )}

              {/* Upload section for experts */}
              {canEditMission() && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {planDeMasseFile && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{planDeMasseFile.name}</span>
                        <Button
                          size="sm"
                          icon={Upload}
                          onClick={handleUploadPlanDeMasse}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {mission.plan_de_masse_url ? 'Remplacer' : 'Uploader'}
                        </Button>
                      </div>
                    )}

                    {uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Upload en cours...</span>
                          <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                        {uploadError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section Résumé de validation avec chiffres réels */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Résumé de validation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bâtiments validés */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Bâtiments</h3>
                    <p className="text-sm text-gray-600">Éléments validés</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {buildingsValidation.completed}/{buildingsValidation.total}
                  </span>
                  <span className={`text-sm font-medium ${buildingsValidation.color}`}>
                    {buildingsValidation.status}
                  </span>
                </div>
                <ProgressBar 
                  progress={buildingsValidation.total > 0 ? (buildingsValidation.completed / buildingsValidation.total) * 100 : 0} 
                  color={buildingsValidation.completed === buildingsValidation.total && buildingsValidation.total > 0 ? "bg-green-500" : "bg-amber-500"} 
                  height="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Matériels validés */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Matériels</h3>
                    <p className="text-sm text-gray-600">Éléments validés</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {materialsValidation.completed}/{materialsValidation.total}
                  </span>
                  <span className={`text-sm font-medium ${materialsValidation.color}`}>
                    {materialsValidation.status}
                  </span>
                </div>
                <ProgressBar 
                  progress={materialsValidation.total > 0 ? (materialsValidation.completed / materialsValidation.total) * 100 : 0} 
                  color={materialsValidation.completed === materialsValidation.total && materialsValidation.total > 0 ? "bg-green-500" : "bg-amber-500"} 
                  height="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Progression totale */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Progression</h3>
                    <p className="text-sm text-gray-600">Totale</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
                  <span className="text-sm text-amber-600 font-medium">
                    {mission.status === 'completed' ? 'Terminé' : 'En cours'}
                  </span>
                </div>
                <ProgressBar 
                  progress={overallProgress} 
                  color={overallProgress === 100 ? "bg-green-500" : "bg-amber-500"} 
                  height="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Informations de la mission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Détails de la mission */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Détails de la mission</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Statut</label>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(mission.status)}`}>
                  {getStatusDisplayName(mission.status)}
                </span>
                {mission.status === 'completed' && <CheckCircle size={20} className="text-green-600" />}
                {mission.priority === 'urgent' && <AlertCircle size={20} className="text-red-600" />}
                {mission.status === 'in_progress' && <Clock size={20} className="text-amber-600" />}
              </div>
            </div>

            {mission.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{mission.description}</p>
              </div>
            )}

            {mission.instructions && (
              <div>
                <label className="text-sm font-medium text-gray-600">Instructions spéciales</label>
                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-900 whitespace-pre-wrap">{mission.instructions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affectation et planning */}
        <div className="space-y-6">
          {/* Affectation */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Affectation</h3>
            </CardHeader>
            <CardContent>
              {mission.assigned_user ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-white">
                        {mission.assigned_user.full_name?.charAt(0) || mission.assigned_user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {mission.assigned_user.full_name || 'Nom non renseigné'}
                      </p>
                      <p className="text-sm text-gray-600">Constatateur</p>
                    </div>
                    <UserCheck size={20} className="text-green-600" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail size={14} className="text-gray-400" />
                      <span className="text-gray-700">{mission.assigned_user.email}</span>
                    </div>
                    {mission.assigned_user.phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-gray-700">{mission.assigned_user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <User size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium">Non assignée</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Cette mission n'a pas encore été assignée à un constatateur
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planning */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Planning</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mission.scheduled_start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Début prévu</span>
                    <span className="text-sm font-medium text-gray-900 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(mission.scheduled_start_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}

                {mission.scheduled_end_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fin prévue</span>
                    <span className="text-sm font-medium text-gray-900 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(mission.scheduled_end_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}

                {mission.actual_start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Début réel</span>
                    <span className="text-sm font-medium text-green-700 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(mission.actual_start_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}

                {mission.actual_end_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fin réelle</span>
                    <span className="text-sm font-medium text-green-700 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(mission.actual_end_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600">Créée le</span>
                  <span className="text-sm text-gray-900">
                    {new Date(mission.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const tabs = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: Eye,
      content: overviewContent,
    },
    {
      id: 'buildings',
      label: 'Bâtiments',
      icon: Building2,
      badge: buildings.length > 0 ? buildings.length : undefined,
      content: (
        <MissionBuildingsTab 
          missionId={mission.id} 
          canEdit={canEditMission()}
          onDataUpdate={handleDataUpdate}
        />
      ),
    },
    {
      id: 'materials',
      label: 'Matériels',
      icon: Wrench,
      badge: materials.length > 0 ? materials.length : undefined,
      content: (
        <MissionMaterialsTab 
          missionId={mission.id} 
          canEdit={canEditMission()}
          onDataUpdate={handleDataUpdate}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ClipboardList className="mr-3 text-blue-600" />
              {mission.title}
            </h1>
            <p className="text-gray-600 mt-1">
              Détails de la mission #{mission.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* PDF Export Button */}
          {canGeneratePdf() && (
            <>
              <Button
                icon={FileDown}
                onClick={handleGeneratePdf}
                loading={isGeneratingPdf || isUploadingPdf}
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                {isUploadingPdf ? 'Upload en cours...' : 'Exporter PDF'}
              </Button>
              
              <Button
                icon={Share}
                onClick={handleShareWhatsApp}
                disabled={!generatedPdfPublicUrl || isGeneratingPdf || isUploadingPdf}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Partage WhatsApp
              </Button>
            </>
          )}

          {/* Status update buttons for constateurs */}
          {canUpdateStatus() && mission.status !== 'completed' && mission.status !== 'cancelled' && (
            <div className="flex items-center space-x-2">
              {mission.status === 'assigned' && (
                <Button
                  icon={Play}
                  onClick={() => handleStatusUpdate('in_progress')}
                  loading={isUpdating}
                  className="bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  Commencer
                </Button>
              )}
              {mission.status === 'in_progress' && (
                <>
                  <Button
                    icon={Pause}
                    onClick={() => handleStatusUpdate('assigned')}
                    loading={isUpdating}
                    variant="outline"
                    size="sm"
                  >
                    Suspendre
                  </Button>
                  <Button
                    icon={CheckCircle}
                    onClick={() => handleStatusUpdate('completed')}
                    loading={isUpdating}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    Fin de mission
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Admin actions */}
          {canEditMission() && (
            <Button
              variant="outline"
              icon={Edit}
              onClick={() => navigate(`/expert-missions?edit=${mission.id}`)}
            >
              Modifier
            </Button>
          )}
          
          {canDeleteMission() && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleDeleteMission}
            >
              Supprimer
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Onglets de la mission avec persistance de l'onglet actif */}
      <Tabs 
        tabs={tabs} 
        defaultTab={activeTab} 
        onTabChange={handleTabChange}
      />
    </div>
  );
};