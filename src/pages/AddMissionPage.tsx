import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Upload, FileText, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

interface MissionFormData {
  title: string;
  scheduled_start_date: string;
  plan_de_masse_file: File | null;
}

export const AddMissionPage: React.FC = () => {
  const { user } = useAuth();
  const { canManageMissions } = useRolePermissions();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<MissionFormData>({
    title: '',
    scheduled_start_date: '',
    plan_de_masse_file: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Vérifier les permissions
  useEffect(() => {
    if (!canManageMissions) {
      navigate('/missions');
    }
  }, [canManageMissions, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Seuls les fichiers PDF, JPG et PNG sont autorisés pour le plan de masse.');
        return;
      }
      
      // Vérifier la taille du fichier (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('Le fichier ne doit pas dépasser 10MB.');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      plan_de_masse_file: file,
    }));
    setError(null);
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      plan_de_masse_file: null,
    }));
  };

  const uploadPlanDeMasse = async (file: File, missionId: string): Promise<{ url: string; path: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `plan-de-masse.${fileExt}`;
    const filePath = `missions/${missionId}/${fileName}`;

    // Upload du fichier vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('mission-documents')
      .upload(filePath, file, {
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

    return {
      url: publicUrl,
      path: filePath,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (!formData.title.trim()) {
      setError('Le nom de la mission est obligatoire.');
      return;
    }

    if (!formData.scheduled_start_date) {
      setError('La date de la mission est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Créer la mission d'abord
      const missionData = {
        title: formData.title.trim(),
        scheduled_start_date: formData.scheduled_start_date,
        mission_type: 'inspection' as const,
        priority: 'medium' as const,
        status: 'draft' as const,
        created_by: user?.id,
      };

      const { data: mission, error: missionError } = await supabase
        .from('missions')
        .insert(missionData)
        .select()
        .single();

      if (missionError) throw missionError;

      // Upload du plan de masse si présent
      if (formData.plan_de_masse_file) {
        setUploadProgress(25);
        
        const { url, path } = await uploadPlanDeMasse(formData.plan_de_masse_file, mission.id);
        
        setUploadProgress(75);

        // Mettre à jour la mission avec les informations du fichier
        const { error: updateError } = await supabase
          .from('missions')
          .update({
            plan_de_masse_url: url,
            plan_de_masse_path: path,
            plan_de_masse_filename: formData.plan_de_masse_file.name,
            plan_de_masse_size: formData.plan_de_masse_file.size,
            plan_de_masse_uploaded_at: new Date().toISOString(),
          })
          .eq('id', mission.id);

        if (updateError) throw updateError;
      }

      setUploadProgress(100);

      // Rediriger vers la page des missions
      navigate('/missions', {
        state: { 
          message: 'Mission créée avec succès !',
          type: 'success'
        }
      });

    } catch (error: any) {
      console.error('Erreur lors de la création de la mission:', error);
      setError(error.message || 'Erreur lors de la création de la mission');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!canManageMissions) {
    return null; // Le useEffect redirigera
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          icon={ArrowLeft}
          onClick={() => navigate('/missions')}
        >
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Créer une nouvelle mission</h1>
          <p className="text-gray-600 mt-1">
            Remplissez les informations de base pour créer une mission
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Informations de la mission</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Nom de la mission */}
            <Input
              label="Nom de la mission *"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Entrez le nom de la mission"
              required
            />

            {/* Date de la mission */}
            <Input
              label="Date de la mission *"
              type="date"
              name="scheduled_start_date"
              value={formData.scheduled_start_date}
              onChange={handleInputChange}
              icon={Calendar}
              required
            />

            {/* Upload du plan de masse */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Plan de masse
              </label>
              
              {!formData.plan_de_masse_file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Glissez-déposez votre plan de masse ici, ou
                    </p>
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        parcourez vos fichiers
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, JPG ou PNG jusqu'à 10MB
                  </p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.plan_de_masse_file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(formData.plan_de_masse_file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={X}
                      onClick={removeFile}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Barre de progression lors de l'upload */}
            {isSubmitting && uploadProgress > 0 && (
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

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/missions')}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Créer la mission
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informations sur les permissions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">À propos du plan de masse :</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Le plan de masse est optionnel lors de la création</li>
              <li>• Seuls les experts peuvent voir et télécharger ce document</li>
              <li>• Les constatateurs verront le document mais ne pourront pas le télécharger</li>
              <li>• Vous pourrez modifier ou remplacer ce document plus tard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};