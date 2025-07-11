import { supabase } from '../lib/supabase';
import { User } from '../types/auth';

export interface DashboardKPIs {
  total: number;
  en_cours: number;
  cloturees: number;
  sans_plan: number;
  // Variations par rapport à la période précédente
  total_variation: number;
  en_cours_variation: number;
  cloturees_variation: number;
  sans_plan_variation: number;
}

export interface DashboardMission {
  id: string;
  title: string;
  lieu: string;
  constateur_name: string;
  progress: number;
  has_plan: boolean;
  scheduled_start_date: string | null;
  status: string;
}

export interface MonthlyStats {
  labels: string[];
  creees: number[];
  cloturees: number[];
}

export interface StatusTableRow {
  statut: string;
  count: number;
  percent: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  missions: DashboardMission[];
  monthlyStats: MonthlyStats;
  statusTable: StatusTableRow[];
  period: string;
}

export type PeriodType = 'ce_mois' | '3_mois' | 'annee_courante' | 'annee_precedente' | 'personnalise';

interface DateRange {
  start: Date;
  end: Date;
}

// Fonction pour calculer les plages de dates
const getDateRange = (period: PeriodType, customStart?: Date, customEnd?: Date): { current: DateRange; previous: DateRange } => {
  const now = new Date();
  let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

  switch (period) {
    case 'ce_mois':
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;

    case '3_mois':
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      currentStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;

    case 'annee_courante':
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31);
      break;

    case 'annee_precedente':
      currentStart = new Date(now.getFullYear() - 1, 0, 1);
      currentEnd = new Date(now.getFullYear() - 1, 11, 31);
      previousStart = new Date(now.getFullYear() - 2, 0, 1);
      previousEnd = new Date(now.getFullYear() - 2, 11, 31);
      break;

    case 'personnalise':
      if (!customStart || !customEnd) {
        throw new Error('Dates personnalisées requises');
      }
      currentStart = customStart;
      currentEnd = customEnd;
      const diffMs = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diffMs);
      break;

    default:
      throw new Error('Période non supportée');
  }

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd }
  };
};

// Fonction pour calculer la variation en pourcentage
const calculateVariation = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Fonction pour obtenir les données du tableau de bord
export const getDashboardData = async (
  user: User,
  period: PeriodType = 'ce_mois',
  customStart?: Date,
  customEnd?: Date
): Promise<DashboardData> => {
  try {
    const { current, previous } = getDateRange(period, customStart, customEnd);
    
    // Construire la requête de base - les politiques RLS gèrent l'accès
    let baseQuery = supabase.from('missions').select(`
      id,
      title,
      status,
      scheduled_start_date,
      created_at,
      plan_de_masse_url,
      assigned_user:assigned_to (
        id,
        full_name,
        email
      ),
      mission_buildings (
        building_id,
        buildings:building_id (
          id,
          designation
        )
      )
    `);

    // Les politiques RLS filtrent automatiquement les missions selon le rôle :
    // - Constatateurs : missions assignées à eux
    // - Experts : toutes les missions (selon les politiques RLS)
    // - Admins/Super admins : toutes les missions

    // Récupérer toutes les missions
    const { data: allMissions, error } = await baseQuery.order('created_at', { ascending: false });
    
    if (error) throw error;

    const missions = allMissions || [];

    // Filtrer les missions pour la période courante
    const currentMissions = missions.filter(mission => {
      const missionDate = new Date(mission.scheduled_start_date || mission.created_at);
      return missionDate >= current.start && missionDate <= current.end;
    });

    // Filtrer les missions pour la période précédente
    const previousMissions = missions.filter(mission => {
      const missionDate = new Date(mission.scheduled_start_date || mission.created_at);
      return missionDate >= previous.start && missionDate <= previous.end;
    });

    // Calculer les KPIs pour la période courante
    const currentTotal = currentMissions.length;
    const currentEnCours = currentMissions.filter(m => ['draft', 'assigned', 'in_progress'].includes(m.status)).length;
    const currentCloturees = currentMissions.filter(m => m.status === 'completed').length;
    const currentSansPlan = currentMissions.filter(m => !m.plan_de_masse_url).length;

    // Calculer les KPIs pour la période précédente
    const previousTotal = previousMissions.length;
    const previousEnCours = previousMissions.filter(m => ['draft', 'assigned', 'in_progress'].includes(m.status)).length;
    const previousCloturees = previousMissions.filter(m => m.status === 'completed').length;
    const previousSansPlan = previousMissions.filter(m => !m.plan_de_masse_url).length;

    // Calculer les variations
    const kpis: DashboardKPIs = {
      total: currentTotal,
      en_cours: currentEnCours,
      cloturees: currentCloturees,
      sans_plan: currentSansPlan,
      total_variation: calculateVariation(currentTotal, previousTotal),
      en_cours_variation: calculateVariation(currentEnCours, previousEnCours),
      cloturees_variation: calculateVariation(currentCloturees, previousCloturees),
      sans_plan_variation: calculateVariation(currentSansPlan, previousSansPlan),
    };

    // Préparer les missions en cours pour le tableau
    const missionsEnCours = currentMissions
      .filter(m => ['draft', 'assigned', 'in_progress'].includes(m.status))
      .map(mission => {
        // Calculer le lieu (premier bâtiment ou "Non spécifié")
        const lieu = mission.mission_buildings?.[0]?.buildings?.designation || 'Non spécifié';
        
        // Calculer la progression (simulation basée sur le statut)
        let progress = 0;
        switch (mission.status) {
          case 'draft': progress = 5; break;
          case 'assigned': progress = 15; break;
          case 'in_progress': progress = Math.floor(Math.random() * 50) + 25; break;
          case 'completed': progress = 100; break;
          default: progress = 0;
        }

        return {
          id: mission.id,
          title: mission.title,
          lieu,
          constateur_name: (mission as any).assigned_user?.full_name || 'Non assigné',
          progress,
          has_plan: !!mission.plan_de_masse_url,
          scheduled_start_date: mission.scheduled_start_date,
          status: mission.status
        };
      })
      .slice(0, 10); // Limiter à 10 missions

    // Calculer les statistiques mensuelles (12 derniers mois)
    const monthlyStats: MonthlyStats = {
      labels: [],
      creees: [],
      cloturees: []
    };

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      monthlyStats.labels.push(monthLabel);

      const creees = missions.filter(m => {
        const createdDate = new Date(m.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;

      const cloturees = missions.filter(m => {
        const completedDate = new Date(m.created_at); // Utiliser created_at comme proxy
        return m.status === 'completed' && completedDate >= monthStart && completedDate <= monthEnd;
      }).length;

      monthlyStats.creees.push(creees);
      monthlyStats.cloturees.push(cloturees);
    }

    // Calculer la distribution des statuts (seulement En cours et Clôturées)
    const totalForDistribution = currentEnCours + currentCloturees;
    const statusTable: StatusTableRow[] = [
      {
        statut: 'En cours',
        count: currentEnCours,
        percent: totalForDistribution > 0 ? Math.round((currentEnCours / totalForDistribution) * 100) : 0
      },
      {
        statut: 'Clôturées',
        count: currentCloturees,
        percent: totalForDistribution > 0 ? Math.round((currentCloturees / totalForDistribution) * 100) : 0
      }
    ];

    // Formater la période pour l'affichage
    let periodDisplay = '';
    switch (period) {
      case 'ce_mois':
        periodDisplay = current.start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        break;
      case '3_mois':
        periodDisplay = `${current.start.toLocaleDateString('fr-FR', { month: 'short' })} - ${current.end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
        break;
      case 'annee_courante':
        periodDisplay = `Année ${current.start.getFullYear()}`;
        break;
      case 'annee_precedente':
        periodDisplay = `Année ${current.start.getFullYear()}`;
        break;
      case 'personnalise':
        periodDisplay = `${current.start.toLocaleDateString('fr-FR')} - ${current.end.toLocaleDateString('fr-FR')}`;
        break;
    }

    return {
      kpis,
      missions: missionsEnCours,
      monthlyStats,
      statusTable,
      period: periodDisplay
    };

  } catch (error) {
    console.error('Erreur lors de la récupération des données du tableau de bord:', error);
    throw error;
  }
};