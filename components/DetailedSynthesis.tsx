
import React, { useState, useMemo, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, Legend, CartesianGrid, XAxis, YAxis
} from 'recharts';
import { Download, Filter, ArrowLeft, FileText, Mic, Sparkles, Calendar, Eye, Activity, Target, Users, DollarSign, TrendingUp } from 'lucide-react';
import { StatData, DailyReport, Site, Period } from '../types';
import { analyzeBusinessData, analyzeReports } from '../services/geminiService';

interface DetailedSynthesisProps {
  data: StatData[];
  reports: DailyReport[];
  currentSite: Site;
  currentPeriod: Period;
  onSiteChange: (site: Site) => void;
  onPeriodChange: (period: Period) => void;
  onNavigate: (path: string) => void;
  onViewReport: (report: any) => void; // Added prop for modal
}

// Helper local pour le filtrage par période standard (réplique de la logique App.tsx)
const isInPeriod = (dateStr: string, period: Period): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (period === Period.DAY) {
    return itemDate.getTime() === today.getTime();
  } else if (period === Period.WEEK) {
    const day = today.getDay(); 
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    monday.setHours(0,0,0,0);
    friday.setHours(23,59,59,999);
    const itemDay = date.getDay();
    if (itemDay === 0 || itemDay === 6) return false;
    return itemDate >= monday && itemDate <= friday;
  } else if (period === Period.MONTH) {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  } else if (period === Period.YEAR) {
    return date.getFullYear() === now.getFullYear();
  }
  return true;
};

export const DetailedSynthesis: React.FC<DetailedSynthesisProps> = ({ 
  data, reports, currentSite, currentPeriod, onSiteChange, onPeriodChange, onNavigate, onViewReport 
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [reportAnalysis, setReportAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingReportAi, setLoadingReportAi] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('All');

  // New States for Custom Date Filtering
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Filter Stat Data Logic (Uses standard period)
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const siteMatch = currentSite === Site.GLOBAL || d.site === currentSite;
      // Pour les stats globales, on garde la logique standard des props
      const periodMatch = isInPeriod(d.date, currentPeriod);
      return siteMatch && periodMatch;
    });
  }, [data, currentSite, currentPeriod]);

  // Filter Reports Logic (Supports Custom Dates)
  const filteredReports = useMemo(() => {
    let filtered = reports.filter(r => currentSite === Site.GLOBAL || r.site === currentSite);
    
    // 1. Date Filter
    if (useCustomDate) {
      if (dateRange.start) {
        filtered = filtered.filter(r => r.date >= dateRange.start);
      }
      if (dateRange.end) {
        filtered = filtered.filter(r => r.date <= dateRange.end);
      }
    } else {
      // Standard Period Filter
      filtered = filtered.filter(r => isInPeriod(r.date, currentPeriod));
    }

    // 2. Technician Filter
    if (selectedTechnician !== 'All') {
      filtered = filtered.filter(r => r.technicianName === selectedTechnician);
    }
    return filtered;
  }, [reports, currentSite, selectedTechnician, currentPeriod, useCustomDate, dateRange]);

  // --- DATA PREPARATION FOR NEW CHARTS ---

  // 1. Radar Data (Domains)
  const radarData = useMemo(() => {
    const counts: Record<string, number> = {
      'Electricité': 0, 'Bâtiment': 0, 'Froid': 0, 'Plomberie': 0
    };
    
    filteredReports.forEach(r => {
      if (r.domain && counts.hasOwnProperty(r.domain)) {
        counts[r.domain]++;
      } else if (r.domain) {
        // Handle variations or 'Autres' if necessary, but focusing on main 4
        // If domain is not in list, ignore or add to other logic
      }
    });

    const maxVal = Math.max(...Object.values(counts));

    return Object.keys(counts).map(key => ({
      subject: key,
      count: counts[key],
      fullMark: maxVal > 0 ? maxVal : 5 // Avoid division by zero issues in visualization scaling
    }));
  }, [filteredReports]);

  // 2. Finance Line Data (Revenue vs Expenses from Reports)
  const financeReportData = useMemo(() => {
    const financeMap = new Map<string, { date: string, recettes: number, depenses: number }>();

    filteredReports.forEach(r => {
      if (!r.date) return;
      if (!financeMap.has(r.date)) {
        financeMap.set(r.date, { date: r.date, recettes: 0, depenses: 0 });
      }
      const entry = financeMap.get(r.date)!;
      // Ensure we treat undefined or empty strings as 0
      entry.recettes += Number(r.revenue || 0);
      entry.depenses += Number(r.expenses || 0);
    });

    // Sort by date
    return Array.from(financeMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredReports]);


  // Aggregated totals (Global Stats)
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      interventions: acc.interventions + curr.interventions,
      profit: acc.profit + curr.profit,
      expenses: acc.expenses + curr.expenses
    }), { revenue: 0, interventions: 0, profit: 0, expenses: 0 });
  }, [filteredData]);

  useEffect(() => {
    setLoadingAi(true);
    analyzeBusinessData(filteredData, currentSite)
      .then(res => setAiAnalysis(res))
      .finally(() => setLoadingAi(false));
  }, [filteredData, currentSite]);

  const handleGenerateReportSummary = () => {
    setLoadingReportAi(true);
    // Note: We pass a string description of the period to the AI
    const periodDesc = useCustomDate 
      ? `du ${dateRange.start} au ${dateRange.end}` 
      : currentPeriod;
      
    analyzeReports(filteredReports, periodDesc)
      .then(res => setReportAnalysis(res))
      .finally(() => setLoadingReportAi(false));
  };

  const uniqueTechnicians = Array.from(new Set(reports.map(r => r.technicianName)));

  return (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => onNavigate('/')} className="p-2 bg-orange-50 border border-orange-100 rounded-full shadow hover:bg-orange-100 transition">
            <ArrowLeft className="text-ebf-orange" />
        </button>
        <h1 className="text-2xl font-bold text-green-900 dark:text-white">Synthèse Analytique Détaillée</h1>
      </div>

       {/* Global Filters */}
       <div className="flex flex-col md:flex-row items-start md:items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-orange-100 dark:border-gray-700 mb-6 gap-4">
          
          {/* Site Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2 mr-2">
              <Filter size={18} className="text-ebf-orange" />
              <span className="font-bold text-green-900 dark:text-gray-300">Site:</span>
            </div>
            <select 
              className="border-orange-200 border rounded-md p-2 text-sm text-green-900 focus:ring-ebf-orange focus:border-ebf-orange outline-none bg-white cursor-pointer"
              value={currentSite}
              onChange={(e) => onSiteChange(e.target.value as Site)}
            >
              <option value={Site.GLOBAL}>Tous les Sites</option>
              <option value={Site.ABIDJAN}>Abidjan</option>
              <option value={Site.BOUAKE}>Bouaké</option>
            </select>
          </div>

          <div className="hidden md:block w-px h-8 bg-orange-200"></div>

          {/* Period Filter (Standard vs Custom) */}
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2">
                <label className="flex items-center cursor-pointer relative">
                  <input type="checkbox" checked={useCustomDate} onChange={() => setUseCustomDate(!useCustomDate)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ebf-orange"></div>
                  <span className="ml-2 text-sm font-medium text-green-900 dark:text-gray-300">Dates précises</span>
                </label>
             </div>

             {!useCustomDate ? (
                <select 
                  className="border-orange-200 border rounded-md p-2 text-sm text-green-900 focus:ring-ebf-orange focus:border-ebf-orange outline-none bg-white cursor-pointer min-w-[150px]"
                  value={currentPeriod}
                  onChange={(e) => onPeriodChange(e.target.value as Period)}
                >
                  <option value={Period.DAY}>Aujourd'hui</option>
                  <option value={Period.WEEK}>Cette Semaine (Lun-Ven)</option>
                  <option value={Period.MONTH}>Ce Mois</option>
                  <option value={Period.YEAR}>Cette Année</option>
                </select>
             ) : (
                <div className="flex items-center gap-2">
                   <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 text-ebf-orange" size={14} />
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="pl-8 border-orange-200 border rounded-md p-1.5 text-sm text-green-900 bg-white focus:ring-ebf-orange outline-none"
                      />
                   </div>
                   <span className="text-gray-400">-</span>
                   <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 text-ebf-orange" size={14} />
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="pl-8 border-orange-200 border rounded-md p-1.5 text-sm text-green-900 bg-white focus:ring-ebf-orange outline-none"
                      />
                   </div>
                </div>
             )}
          </div>

          <div className="hidden md:block w-px h-8 bg-orange-200"></div>

          {/* Technician Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Users size={18} className="text-ebf-orange" />
              <span className="font-bold text-green-900 dark:text-gray-300">Technicien:</span>
            </div>
            <select 
              className="border-orange-200 border rounded-md p-2 text-sm text-green-900 focus:ring-ebf-orange focus:border-ebf-orange outline-none bg-white cursor-pointer min-w-[150px]"
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
            >
              <option value="All">Tous</option>
              {uniqueTechnicians.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
      </div>

      {/* --- NOUVELLE SECTION: SYNTHÈSE GÉNÉRALE (TOTAUX) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-ebf-orange flex items-center justify-between">
           <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold text-ebf-orange mt-1">{totals.revenue.toLocaleString()} FCFA</p>
           </div>
           <div className="p-3 bg-orange-50 rounded-full text-ebf-orange">
              <DollarSign size={24} />
           </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-ebf-green flex items-center justify-between">
           <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Bénéfices Nets</p>
              <p className="text-2xl font-bold text-ebf-green mt-1">{totals.profit.toLocaleString()} FCFA</p>
           </div>
           <div className="p-3 bg-green-50 rounded-full text-ebf-green">
              <TrendingUp size={24} />
           </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex items-center justify-between">
           <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Total Interventions</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totals.interventions}</p>
           </div>
           <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <Activity size={24} />
           </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-r from-orange-50 to-green-50 p-6 rounded-lg border border-orange-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h4 className="text-lg font-bold text-green-900 dark:text-white mb-2 flex items-center">
          ✨ Analyse Stratégique (Gemini)
        </h4>
        {loadingAi ? (
          <div className="animate-pulse flex space-x-4">
            <div className="h-2 bg-orange-200 rounded col-span-2 w-full"></div>
          </div>
        ) : (
          <p className="text-green-800 dark:text-gray-300 italic">"{aiAnalysis}"</p>
        )}
      </div>

      {/* Grid of Global Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Sector Repartition (Pie) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-ebf-green border-x border-b border-green-50 dark:border-gray-700">
          <h4 className="font-semibold text-center mb-4 text-green-900 dark:text-gray-200">Répartition Coûts vs Profits (Global)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Dépenses', value: totals.expenses },
                    { name: 'Bénéfices', value: totals.profit },
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#228B22" />
                </Pie>
                <Tooltip formatter={(val: number) => val.toLocaleString() + ' FCFA'} contentStyle={{backgroundColor: '#fff', borderColor: '#228B22', color: '#14532d'}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Evolution Curve (Line) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-ebf-orange border-x border-b border-orange-50 dark:border-gray-700">
          <h4 className="font-semibold text-center mb-4 text-green-900 dark:text-gray-200">Évolution de la Rentabilité (Global)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip contentStyle={{backgroundColor: '#fff', borderColor: '#FF8C00', color: '#14532d'}} />
                <Legend />
                <Line type="monotone" dataKey="profit" name="Bénéfice" stroke="#FF8C00" strokeWidth={3} dot={{r: 4}} />
                <Line type="monotone" dataKey="expenses" name="Dépenses" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- NOUVELLE SECTION: ANALYSE MÉTIER & FINANCIÈRE (RAPPORTS) --- */}
      <div className="mt-8 mb-6">
        <h3 className="text-xl font-bold text-green-900 dark:text-white flex items-center mb-4">
           <Activity className="mr-2 text-ebf-green" />
           Analyse Métier & Financière (Données Rapports)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 3. Radar Chart (Domaines) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-orange-100 dark:border-gray-700">
             <h4 className="font-semibold text-center mb-4 text-green-900 dark:text-gray-200 flex items-center justify-center gap-2">
               <Target size={16} className="text-ebf-orange" />
               Répartition par Domaine
             </h4>
             <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#14532d', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar
                      name="Interventions"
                      dataKey="count"
                      stroke="#228B22"
                      strokeWidth={2}
                      fill="#228B22"
                      fillOpacity={0.6}
                    />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #228B22', color: '#14532d' }} />
                  </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* 4. Line Chart (Recettes vs Dépenses) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-orange-100 dark:border-gray-700">
             <h4 className="font-semibold text-center mb-4 text-green-900 dark:text-gray-200 flex items-center justify-center gap-2">
               <Activity size={16} className="text-ebf-green" />
               Évolution Financière (Rapports)
             </h4>
             <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financeReportData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis dataKey="date" tick={{fontSize: 10}} />
                     <YAxis tick={{fontSize: 10}} width={40} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #fed7aa', color: '#14532d' }} 
                        formatter={(val: number) => val.toLocaleString() + ' FCFA'}
                     />
                     <Legend verticalAlign="top" height={36} />
                     <Line type="monotone" dataKey="recettes" name="Recettes" stroke="#16a34a" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                     <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#dc2626" strokeWidth={2} dot={{r: 4}} />
                  </LineChart>
               </ResponsiveContainer>
             </div>
          </div>

        </div>
      </div>

      {/* --- SECTION RAPPORTS TECHNICIENS (LISTE) --- */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-green-900 dark:text-white flex items-center">
            <FileText className="mr-2 text-ebf-orange" />
            Synthèse des Rapports Techniciens
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Liste des rapports */}
           <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-orange-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-orange-50 dark:bg-gray-700 px-6 py-3 border-b border-orange-100 dark:border-gray-600 font-medium text-orange-800 dark:text-orange-200 text-sm flex justify-between items-center">
                <span>Historique filtré ({filteredReports.length} rapports)</span>
                {useCustomDate && (
                  <span className="text-xs bg-white px-2 py-0.5 rounded border border-orange-200 text-ebf-orange font-bold">
                    {dateRange.start || '?'} au {dateRange.end || '?'}
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar p-0">
                {filteredReports.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">Aucun rapport pour cette sélection.</div>
                ) : (
                  <table className="w-full">
                    <tbody className="divide-y divide-orange-50 dark:divide-gray-700">
                      {filteredReports.map(report => (
                        <tr key={report.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-700 transition">
                          <td className="p-4 align-top w-12">
                             {report.method === 'Voice' ? (
                               <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center"><Mic size={14} /></div>
                             ) : (
                               <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center"><FileText size={14} /></div>
                             )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-green-900 dark:text-gray-200 text-sm">{report.technicianName}</span>
                              <span className="text-xs text-gray-500">{report.date}</span>
                            </div>
                            <p className="text-sm text-green-800 dark:text-gray-400">{report.content}</p>
                            {report.method === 'Form' && (
                              <span className="text-xs text-orange-600 bg-orange-50 px-1 rounded mt-1 inline-block">
                                {report.domain} - {report.interventionType}
                              </span>
                            )}
                          </td>
                          <td className="p-4 align-middle text-right">
                             <button 
                               onClick={() => onViewReport(report)}
                               className="text-ebf-green hover:text-white hover:bg-ebf-green transition font-bold text-xs border border-ebf-green px-3 py-1 rounded-md flex items-center gap-1 ml-auto"
                             >
                               <Eye size={12} /> VOIR
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
           </div>

           {/* Synthèse IA des rapports */}
           <div className="bg-indigo-50 dark:bg-gray-800 rounded-lg p-6 border border-indigo-100 dark:border-gray-700 flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                 <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
                 <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Synthèse Intelligente</h4>
              </div>
              
              <div className="flex-1 bg-white/60 dark:bg-gray-700 rounded-lg p-4 mb-4 text-sm text-green-900 dark:text-gray-200 overflow-y-auto min-h-[150px]">
                 {loadingReportAi ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-2 bg-indigo-200 rounded w-3/4"></div>
                      <div className="h-2 bg-indigo-200 rounded w-full"></div>
                      <div className="h-2 bg-indigo-200 rounded w-5/6"></div>
                    </div>
                 ) : reportAnalysis ? (
                   <div className="whitespace-pre-line">{reportAnalysis}</div>
                 ) : (
                   <p className="text-gray-400 italic text-center mt-8">Cliquez ci-dessous pour analyser les rapports filtrés.</p>
                 )}
              </div>

              <button 
                onClick={handleGenerateReportSummary}
                disabled={filteredReports.length === 0 || loadingReportAi}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-medium shadow-sm transition flex justify-center items-center gap-2"
              >
                {loadingReportAi ? 'Analyse en cours...' : 'Générer le résumé'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
