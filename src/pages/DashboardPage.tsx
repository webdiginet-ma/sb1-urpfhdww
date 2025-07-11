import React, { useState, useEffect } from 'react';
import { BarChart3, Users, TrendingUp, AlertTriangle, ClipboardList, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardData, DashboardData, PeriodType } from '../services/dashboardService';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import { KpiCard } from '../components/dashboard/KpiCard';
import { MissionsTable } from '../components/dashboard/MissionsTable';
import { MonthlyStatsChart } from '../components/dashboard/MonthlyStatsChart';
import { StatusDistributionTable } from '../components/dashboard/StatusDistributionTable';
import { MissionsWithoutPlanAlert } from '../components/dashboard/MissionsWithoutPlanAlert';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('ce_mois');

  useEffect(() => {
    if (user) {
      loadDashboardData(selectedPeriod);
    }
  }, [user, selectedPeriod]);

  const loadDashboardData = async (
    period: PeriodType, 
    customStart?: Date, 
    customEnd?: Date
  ) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getDashboardData(user, period, customStart, customEnd);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (
    period: PeriodType, 
    customStart?: Date, 
    customEnd?: Date
  ) => {
    setSelectedPeriod(period);
    loadDashboardData(period, customStart, customEnd);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucune donnée disponible</p>
      </div>
    );
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrateur';
      case 'expert': return 'Expert';
      case 'constateur': return 'Constatateur';
      default: return role;
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* En-tête avec sélecteur de période */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="text-gray-600 mt-2">
            Bienvenue, {user?.full_name || user?.email} ({getRoleDisplayName(user?.role || '')})
          </p>
          {dashboardData.period && (
            <p className="text-sm text-gray-500 mt-1">
              Période : {dashboardData.period}
            </p>
          )}
        </div>
        
        <PeriodSelector
          value={selectedPeriod}
          onChange={handlePeriodChange}
          className="lg:ml-auto"
        />
      </div>

      {/* Rangée 1 - Cartes KPI (grille responsive 12 colonnes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Missions totales"
          value={dashboardData.kpis.total}
          variation={dashboardData.kpis.total_variation}
          icon={ClipboardList}
          color="blue"
        />
        <KpiCard
          title="Missions en cours"
          value={dashboardData.kpis.en_cours}
          variation={dashboardData.kpis.en_cours_variation}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          title="Missions clôturées"
          value={dashboardData.kpis.cloturees}
          variation={dashboardData.kpis.cloturees_variation}
          icon={CheckCircle}
          color="green"
        />
        <KpiCard
          title="Missions sans plan de masse"
          value={dashboardData.kpis.sans_plan}
          variation={dashboardData.kpis.sans_plan_variation}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Rangée 2 - Tableau "Missions en cours" (12 col.) */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Missions en cours ({dashboardData.missions.length})
          </h2>
          <MissionsTable missions={dashboardData.missions} />
        </div>
      </div>

      {/* Rangée 3 - Statistiques mensuelles (12 col.) */}
      <div className="grid grid-cols-1 gap-6">
        <MonthlyStatsChart data={dashboardData.monthlyStats} />
      </div>

      {/* Rangée 4 - Distribution des statuts (12 col.) */}
      <div className="grid grid-cols-1 gap-6">
        <StatusDistributionTable data={dashboardData.statusTable} />
      </div>

      {/* Panneau d'alerte - Missions sans plan de masse */}
      <MissionsWithoutPlanAlert />
    </div>
  );
};