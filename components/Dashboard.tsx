
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Filter, TrendingUp, Maximize2, DollarSign, Activity, Users, Star, ArrowUpRight, ArrowDownRight, Clock, Trash2, FileText, AlertTriangle, X, Download } from 'lucide-react';
import { StatData, Site, Period, TickerMessage, DailyReport, StockItem } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DashboardProps {
  data: StatData[];
  reports: DailyReport[];
  tickerMessages: TickerMessage[];
  stock: StockItem[];
  currentSite: Site;
  currentPeriod: Period;
  onSiteChange: (site: Site) => void;
  onPeriodChange: (period: Period) => void;
  onNavigate: (path: string) => void;
  onDeleteReport: (id: string) => void;
}

const KPICard = ({ title, value, subtext, icon: Icon, trend, colorClass, bgClass, borderClass }: any) => (
  <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 ${borderClass} border-y border-r border-orange-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${bgClass} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} className={colorClass} />
      </div>
      {trend && (
        <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend > 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <h3 className="text-green-700 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">{title}</h3>
    <div className="mt-1 flex items-baseline">
      <p className="text-2xl font-bold text-green-900 dark:text-white">{value}</p>
    </div>
    <p className="text-xs text-gray-400 mt-2">{subtext}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ 
  data, reports, tickerMessages, stock, currentSite, currentPeriod, onSiteChange, onPeriodChange, onNavigate, onDeleteReport 
}) => {
  const [reportToDelete, setReportToDelete] = useState<DailyReport | null>(null);

  // --- LOGIC: SCAN STOCK FOR ALERTS ---
  // Analyse des stocks en temps réel pour injecter des alertes dans le ticker
  const combinedTickerMessages = useMemo(() => {
    // 1. Identifier les stocks critiques
    const stockAlerts: TickerMessage[] = stock
      .filter(item => {
        // Filtre par site si nécessaire : Global voit tout, sinon filtre par site
        const isSiteRelevant = currentSite === Site.GLOBAL || item.site === currentSite;
        // Condition d'alerte : Quantité <= Seuil
        return isSiteRelevant && item.quantity <= item.threshold;
      })
      .map(item => ({
        id: `stock-alert-${item.id}`,
        // Message clair avec icône alerte
        text: `⚠️ STOCK CRITIQUE : ${item.name} (${item.quantity} ${item.unit} restants) à ${item.site}`,
        type: 'alert',
        display_order: 0, // Priorité haute pour apparaître en premier
        isManual: false
      }));

    // 2. Fusionner avec les messages existants (Flash Info Auto & Manuel passés via props)
    // Les alertes stock sont placées en premier
    return [...stockAlerts, ...tickerMessages];
  }, [stock, tickerMessages, currentSite]);

  // Filter Data Logic
  const filteredData = useMemo(() => {
    return data.filter(d => {
      // 1. Site Filter
      const matchSite = currentSite === Site.GLOBAL || d.site === currentSite;
      
      // 2. Date Filter
      const date = new Date(d.date);
      const now = new Date();
      let matchPeriod = true;

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (currentPeriod === Period.DAY) {
        matchPeriod = itemDate.getTime() === today.getTime();
      } else if (currentPeriod === Period.WEEK) {
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        matchPeriod = itemDate >= oneWeekAgo && itemDate <= today;
      } else if (currentPeriod === Period.MONTH) {
        matchPeriod = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else if (currentPeriod === Period.YEAR) {
        matchPeriod = date.getFullYear() === now.getFullYear();
      }

      return matchSite && matchPeriod;
    });
  }, [data, currentSite, currentPeriod]);

  // Filter Reports Logic for Satisfaction
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchSite = currentSite === Site.GLOBAL || r.site === currentSite;
      
      const date = new Date(r.date);
      const now = new Date();
      let matchPeriod = true;

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (currentPeriod === Period.DAY) {
        matchPeriod = itemDate.getTime() === today.getTime();
      } else if (currentPeriod === Period.WEEK) {
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        matchPeriod = itemDate >= oneWeekAgo && itemDate <= today;
      } else if (currentPeriod === Period.MONTH) {
        matchPeriod = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else if (currentPeriod === Period.YEAR) {
        matchPeriod = date.getFullYear() === now.getFullYear();
      }

      return matchSite && matchPeriod;
    });
  }, [reports, currentSite, currentPeriod]);

  // Aggregated totals for the cards
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      interventions: acc.interventions + curr.interventions,
      profit: acc.profit + curr.profit,
      expenses: acc.expenses + curr.expenses
    }), { revenue: 0, interventions: 0, profit: 0, expenses: 0 });
  }, [filteredData]);

  // Calculate Average Satisfaction
  const satisfactionStats = useMemo(() => {
    const ratedReports = filteredReports.filter(r => r.rating !== undefined && r.rating > 0);
    if (ratedReports.length === 0) return { avg: 0, count: 0 };
    
    const totalRating = ratedReports.reduce((sum, r) => sum + (r.rating || 0), 0);
    const average = (totalRating / ratedReports.length).toFixed(1);
    
    return { avg: average, count: ratedReports.length };
  }, [filteredReports]);

  // Calculate profit margin percentage
  const marginPercent = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : "0";

  // Handle Delete Confirmation
  const confirmDelete = () => {
    if (reportToDelete) {
      onDeleteReport(reportToDelete.id);
      setReportToDelete(null);
    }
  };

  // --- EXPORT PDF FUNCTION ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString('fr-FR');

    // -- Header --
    doc.setFillColor(255, 140, 0); // EBF Orange
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("EBF MANAGER - RAPPORT DE SYNTHÈSE", 14, 13);
    
    // -- Sub-Header --
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le : ${todayStr}`, 14, 30);
    doc.text(`Site concerné : ${currentSite}`, 14, 35);
    doc.text(`Période : ${currentPeriod}`, 14, 40);

    // -- Financial Summary Box --
    doc.setDrawColor(34, 139, 34); // EBF Green
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 45, 180, 25, 3, 3);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34); // Green Text
    doc.text("RÉSUMÉ FINANCIER", 20, 53);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chiffre d'Affaires : ${totals.revenue.toLocaleString()} FCFA`, 20, 62);
    doc.text(`Bénéfice Net : ${totals.profit.toLocaleString()} FCFA (${marginPercent}%)`, 100, 62);
    doc.text(`Volume Interventions : ${totals.interventions}`, 20, 67);

    // -- Table Data --
    const tableBody = filteredReports.map(r => [
      r.date,
      r.technicianName,
      r.domain || '-',
      r.content || '',
      r.revenue ? `${r.revenue.toLocaleString()} F` : '-'
    ]);

    // -- Generate Table --
    autoTable(doc, {
      startY: 75,
      head: [['Date', 'Technicien', 'Domaine', 'Détails', 'Recette']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [255, 140, 0], textColor: 255 }, // Orange header
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25, halign: 'right' },
      }
    });

    // -- Footer --
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('EBF Manager - Document confidentiel interne', 14, 285);
        doc.text(`Page ${i} / ${pageCount}`, 190, 285, { align: 'right' });
    }

    doc.save(`Rapport_EBF_${currentSite}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Ticker Tape - BOUCLE INFINIE */}
      {combinedTickerMessages.length > 0 && (
        <div className="bg-green-950 text-ebf-white p-2 overflow-hidden shadow-md rounded-lg border-b-4 border-ebf-orange relative h-12 flex items-center group">
          <div className="absolute left-0 top-0 bottom-0 z-20 bg-green-950 px-2 flex items-center shadow-lg border-r border-green-800">
            <Clock size={16} className="text-ebf-orange animate-pulse" />
            <span className="font-bold text-xs ml-1 tracking-wider text-white">FLASH</span>
          </div>
          
          {/* Container dupliqué pour animation infinie */}
          <div className="animate-ticker flex items-center pl-4 group-hover:pause">
            {/* Séquence 1 */}
            <div className="flex space-x-12 items-center pr-96 min-w-max">
              {combinedTickerMessages.map((msg) => (
                <div key={msg.id} className="flex items-center space-x-2 whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    msg.type === 'alert' ? 'bg-red-500' : 
                    msg.type === 'success' ? 'bg-green-500' : 'bg-blue-400'
                  }`}></span>
                  <span className={`${
                    msg.type === 'alert' ? 'text-red-400 font-bold' : 
                    msg.type === 'success' ? 'text-green-400 font-bold' : 'text-gray-100'
                  } text-sm font-medium tracking-wide`}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Séquence 2 (Copie pour boucle) */}
            <div className="flex space-x-12 items-center pr-96 min-w-max">
              {combinedTickerMessages.map((msg) => (
                <div key={`dup-${msg.id}`} className="flex items-center space-x-2 whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    msg.type === 'alert' ? 'bg-red-500' : 
                    msg.type === 'success' ? 'bg-green-500' : 'bg-blue-400'
                  }`}></span>
                  <span className={`${
                    msg.type === 'alert' ? 'text-red-400 font-bold' : 
                    msg.type === 'success' ? 'text-green-400 font-bold' : 'text-gray-100'
                  } text-sm font-medium tracking-wide`}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-ebf-orange border-y border-r border-orange-100 dark:border-gray-700 gap-3 md:gap-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex items-center space-x-2 bg-orange-50 dark:bg-gray-700 px-2 py-1.5 rounded-lg border border-orange-200 dark:border-gray-600">
            <Filter size={16} className="text-ebf-orange" />
            <span className="font-bold text-ebf-orange text-xs md:text-sm">Filtres</span>
          </div>
          <select 
            className="bg-white border-orange-200 border rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-green-900 font-medium focus:ring-2 focus:ring-ebf-orange focus:border-ebf-orange outline-none shadow-sm cursor-pointer"
            value={currentSite}
            onChange={(e) => onSiteChange(e.target.value as Site)}
          >
            <option value={Site.GLOBAL}>🌍 Tous les Sites</option>
            <option value={Site.ABIDJAN}>🇨🇮 Abidjan</option>
            <option value={Site.BOUAKE}>🇨🇮 Bouaké</option>
          </select>
          <select 
            className="bg-white border-orange-200 border rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-green-900 font-medium focus:ring-2 focus:ring-ebf-orange focus:border-ebf-orange outline-none shadow-sm cursor-pointer"
            value={currentPeriod}
            onChange={(e) => onPeriodChange(e.target.value as Period)}
          >
            <option value={Period.DAY}>Aujourd'hui</option>
            <option value={Period.WEEK}>Cette Semaine</option>
            <option value={Period.MONTH}>Ce Mois</option>
            <option value={Period.YEAR}>Cette Année</option>
          </select>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={handleExportPDF}
                className="flex items-center justify-center space-x-2 bg-white border border-ebf-orange text-ebf-orange px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-orange-50 transition transform hover:-translate-y-0.5 text-sm md:text-base font-medium shadow-sm"
            >
                <Download size={16} className="md:w-5 md:h-5" />
                <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button 
            onClick={() => onNavigate('/synthesis')}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-ebf-green to-emerald-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-lg hover:shadow-lg hover:shadow-green-200 transition transform hover:-translate-y-0.5 text-sm md:text-base"
            >
            <Maximize2 size={16} className="md:w-5 md:h-5" />
            <span className="font-medium">Synthèse Détaillée</span>
            </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard 
          title="Chiffre d'Affaires" 
          value={`${totals.revenue.toLocaleString()} FCFA`}
          subtext="Total sur la période"
          icon={DollarSign}
          trend={12.5}
          colorClass="text-ebf-orange"
          bgClass="bg-orange-50 dark:bg-gray-700"
          borderClass="border-ebf-orange"
        />
        <KPICard 
          title="Bénéfice Net" 
          value={`${totals.profit.toLocaleString()} FCFA`}
          subtext={`${marginPercent}% de marge`}
          icon={TrendingUp}
          trend={8.2}
          colorClass="text-ebf-green"
          bgClass="bg-green-50 dark:bg-gray-700"
          borderClass="border-ebf-green"
        />
        <KPICard 
          title="Interventions" 
          value={totals.interventions}
          subtext="Réalisées avec succès"
          icon={Activity}
          colorClass="text-blue-500"
          bgClass="bg-blue-50 dark:bg-gray-700"
          borderClass="border-blue-500"
        />
        <KPICard 
          title="Satisfaction Client" 
          value={satisfactionStats.count > 0 ? `${satisfactionStats.avg}/5` : "N/A"}
          subtext={satisfactionStats.count > 0 ? `Basé sur ${satisfactionStats.count} avis` : "Aucune note disponible"}
          icon={Star}
          colorClass="text-yellow-500"
          bgClass="bg-yellow-50 dark:bg-gray-700"
          borderClass="border-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Single Histogram */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-orange-100 dark:border-gray-700 border-t-4 border-gray-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-green-900 dark:text-white flex items-center">
              <TrendingUp className="mr-2 text-ebf-orange" size={20} />
              Performance Globale (CA vs Bénéfice vs Interventions)
            </h3>
            <span className="text-xs text-orange-600 font-bold bg-orange-50 border border-orange-100 px-2 py-1 rounded">Vue temps réel</span>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {filteredData.length > 0 ? (
                <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#14532d'}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" orientation="left" stroke="#14532d" tickFormatter={(value) => `${value / 1000}k`} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip 
                    cursor={{fill: '#fff7ed'}}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #fed7aa', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#14532d' }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar yAxisId="left" dataKey="revenue" name="Chiffre d'Affaires" fill="#FF8C00" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar yAxisId="left" dataKey="profit" name="Bénéfices" fill="#228B22" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar yAxisId="right" dataKey="interventions" name="Volume Interventions" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400 flex-col">
                  <Filter size={48} className="mb-2 opacity-30" />
                  <p>Aucune donnée pour cette période.</p>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- SECTION DERNIERS RAPPORTS AVEC SUPPRESSION --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-orange-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-green-900 dark:text-white flex items-center mb-4">
            <FileText className="mr-2 text-ebf-green" size={20} />
            Derniers Rapports Journaliers
          </h3>
          <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50 border-b border-gray-100">
                 <tr>
                   <th className="p-3 text-left text-xs font-bold uppercase text-gray-500">Date</th>
                   <th className="p-3 text-left text-xs font-bold uppercase text-gray-500">Technicien</th>
                   <th className="p-3 text-left text-xs font-bold uppercase text-gray-500">Contenu</th>
                   <th className="p-3 text-right text-xs font-bold uppercase text-gray-500">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filteredReports.slice(0, 5).map((r: any) => (
                    <tr key={r.id} className="hover:bg-orange-50/50">
                      <td className="p-3 text-sm font-bold text-gray-700">{r.date}</td>
                      <td className="p-3 text-sm text-gray-700">{r.technicianName}</td>
                      <td className="p-3 text-sm text-gray-600 truncate max-w-xs">{r.content || '...'}</td>
                      <td className="p-3 text-right">
                         <button 
                           onClick={() => setReportToDelete(r)}
                           className="p-1.5 text-red-500 bg-red-50 rounded hover:bg-red-100 transition"
                           title="Supprimer ce rapport"
                         >
                            <Trash2 size={16}/>
                         </button>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                     <tr><td colSpan={4} className="p-4 text-center text-gray-400">Aucun rapport récent.</td></tr>
                  )}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL (LOCAL TO DASHBOARD) --- */}
      {reportToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-green-900/60 backdrop-blur-sm" onClick={() => setReportToDelete(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-fade-in border border-red-100">
                <button onClick={() => setReportToDelete(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <AlertTriangle size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-green-900 dark:text-white mb-2">Supprimer le rapport ?</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                        Êtes-vous sûr de vouloir supprimer le rapport de <span className="font-bold">{reportToDelete.technicianName}</span> du <span className="font-bold">{reportToDelete.date}</span> ?
                        <br/><br/>
                        <span className="text-red-500 font-bold">Cette action est irréversible.</span>
                    </p>
                    <div className="flex gap-4 w-full">
                        <button onClick={() => setReportToDelete(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-bold">
                            Annuler
                        </button>
                        <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold shadow-md">
                            Confirmer
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
