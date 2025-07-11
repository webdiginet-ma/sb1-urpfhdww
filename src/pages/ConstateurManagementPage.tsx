import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, UserCheck, UserX, Mail, User, Phone, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { User as UserType } from '../types/auth';

interface ConstateurFormData {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

const ITEMS_PER_PAGE = 10;

export const ConstateurManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [constateurs, setConstateurs] = useState<UserType[]>([]);
  const [filteredConstateurs, setFilteredConstateurs] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConstateur, setEditingConstateur] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<ConstateurFormData>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Vérifier que l'utilisateur est bien expert ou plus
  const canManageConstateurs = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'expert';

  if (!canManageConstateurs) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Eye className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Cette section est réservée aux experts pour gérer leurs constatateurs.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchConstateurs();
  }, [user]);

  useEffect(() => {
    // Filtrer les constatateurs selon le terme de recherche
    const filtered = constateurs.filter(constateur =>
      constateur.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      constateur.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      constateur.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredConstateurs(filtered);
    setCurrentPage(1); // Reset à la première page lors d'une recherche
  }, [constateurs, searchTerm]);

  const fetchConstateurs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'constateur')
        .order('created_at', { ascending: false });

      // Si c'est un expert, ne voir que les constatateurs qu'il a créés
      if (user?.role === 'expert') {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConstateurs(data || []);
    } catch (error: any) {
      setError(error.message || 'Erreur lors du chargement des constatateurs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      password: '',
    });
    setShowCreateForm(false);
    setEditingConstateur(null);
  };

  const createUserViaEdgeFunction = async (userData: ConstateurFormData, role: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        phone: userData.phone || null,
        role: role,
        created_by: user?.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la création de l\'utilisateur');
    }

    return result.user;
  };

  const deleteUserViaEdgeFunction = async (userId: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        deleted_by: user?.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la suppression de l\'utilisateur');
    }

    return result;
  };

  const handleCreateConstateur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createUserViaEdgeFunction(formData, 'constateur');
      await fetchConstateurs();
      resetForm();
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la création du constatateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditConstateur = (constateur: UserType) => {
    setEditingConstateur(constateur);
    setFormData({
      full_name: constateur.full_name || '',
      email: constateur.email,
      phone: constateur.phone || '',
      password: '', // Ne pas pré-remplir le mot de passe
    });
    setShowCreateForm(true);
  };

  const handleUpdateConstateur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !editingConstateur) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          nom: formData.full_name,
          phone: formData.phone || null,
          numero_tel: formData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingConstateur.id);

      if (error) throw error;

      await fetchConstateurs();
      resetForm();
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la mise à jour du constatateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (constateurId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', constateurId);

      if (error) throw error;

      setConstateurs(prev =>
        prev.map(constateur =>
          constateur.id === constateurId ? { ...constateur, is_active: isActive } : constateur
        )
      );
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteConstateur = async (constateurId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce constatateur ? Cette action est irréversible.')) {
      return;
    }

    try {
      setError(null);
      await deleteUserViaEdgeFunction(constateurId);
      
      // Rafraîchir la liste depuis la base de données pour s'assurer de la cohérence
      await fetchConstateurs();
      
      // Afficher un message de succès temporaire
      const successMessage = 'Constatateur supprimé avec succès';
      setError(null);
      
      // Optionnel: afficher un message de succès
      const tempDiv = document.createElement('div');
      tempDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg z-50';
      tempDiv.textContent = successMessage;
      document.body.appendChild(tempDiv);
      
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 3000);
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.message || 'Erreur lors de la suppression du constatateur');
      
      // Rafraîchir quand même la liste pour vérifier l'état réel
      await fetchConstateurs();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Pagination
  const totalPages = Math.ceil(filteredConstateurs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentConstateurs = filteredConstateurs.slice(startIndex, endIndex);

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
            <Eye className="mr-3 text-blue-600" />
            Gestion des constatateurs
          </h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'expert' 
              ? 'Gérez vos constatateurs et leurs permissions.'
              : 'Gérez tous les constatateurs de la plateforme.'
            }
          </p>
        </div>
        <Button 
          icon={Plus}
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Nouveau constatateur
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Barre de recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de création/modification */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingConstateur ? 'Modifier le constatateur' : 'Créer un nouveau constatateur'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                Annuler
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingConstateur ? handleUpdateConstateur : handleCreateConstateur} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom complet"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  icon={User}
                  placeholder="Nom complet"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  icon={Mail}
                  placeholder="adresse@email.com"
                  required
                  disabled={!!editingConstateur}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Téléphone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  icon={Phone}
                  placeholder="Numéro de téléphone"
                />
                {!editingConstateur && (
                  <Input
                    label="Mot de passe"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mot de passe (min. 6 caractères)"
                    required
                  />
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
                  {editingConstateur ? 'Mettre à jour' : 'Créer le constatateur'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des constatateurs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Liste des constatateurs
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {filteredConstateurs.length} constatateur{filteredConstateurs.length > 1 ? 's' : ''}
                {searchTerm && ` (filtré${filteredConstateurs.length > 1 ? 's' : ''})`}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {currentConstateurs.length === 0 ? (
            <div className="text-center py-12">
              <Eye size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun constatateur'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Aucun constatateur ne correspond à votre recherche.'
                  : 'Créez votre premier compte constatateur.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Constatateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé le
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentConstateurs.map((constateur) => (
                      <tr key={constateur.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {constateur.full_name?.charAt(0) || constateur.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {constateur.full_name || 'Nom non renseigné'}
                              </div>
                              <div className="text-sm text-gray-500">{constateur.email}</div>
                              {constateur.phone && (
                                <div className="text-xs text-gray-400">{constateur.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            constateur.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {constateur.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(constateur.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Edit}
                              onClick={() => handleEditConstateur(constateur)}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant={constateur.is_active ? "outline" : "secondary"}
                              size="sm"
                              icon={constateur.is_active ? UserX : UserCheck}
                              onClick={() => handleToggleStatus(constateur.id, !constateur.is_active)}
                            >
                              {constateur.is_active ? 'Désactiver' : 'Activer'}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteConstateur(constateur.id)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Affichage de {startIndex + 1} à {Math.min(endIndex, filteredConstateurs.length)} sur {filteredConstateurs.length} résultats
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};