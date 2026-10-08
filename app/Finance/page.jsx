"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Search,
  User,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function FinanceDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all"); // 'all', 'month', 'quarter', 'year'

  const fetchFinanceStats = async () => {
    setLoading(true);
    setError("");
    try {
      let queryUrl = "/api/Stats/finance";
      const now = new Date();

      if (period === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        queryUrl += `?startDate=${start}`;
      } else if (period === "quarter") {
        const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
          .toISOString()
          .split("T")[0];
        queryUrl += `?startDate=${start}`;
      } else if (period === "year") {
        const start = new Date(now.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        queryUrl += `?startDate=${start}`;
      }

      const res = await fetch(queryUrl);
      if (!res.ok) throw new Error("Erreur de chargement des données financières");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du calcul des statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceStats();
  }, [period]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-50)] via-white to-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ======================================================== */}
        {/* HEADER */}
        {/* ======================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[var(--color-600)] to-[var(--color-500)] text-white shadow-md">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  Finances & Trésorerie
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Suivi des encaissements, des dettes patients et de l'activité financière du cabinet
                </p>
              </div>
            </div>
          </div>

          {/* Period selector & Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPeriod("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "all"
                    ? "bg-[var(--color-600)] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setPeriod("month")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "month"
                    ? "bg-[var(--color-600)] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => setPeriod("quarter")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "quarter"
                    ? "bg-[var(--color-600)] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3 mois
              </button>
              <button
                type="button"
                onClick={() => setPeriod("year")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "year"
                    ? "bg-[var(--color-600)] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cette année
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchFinanceStats}
              disabled={loading}
              className="rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* KPI CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Facturé */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Facturé
              </span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {loading ? (
                <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${Number(data?.totalBilled || 0).toLocaleString("fr-FR")} DZD`
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Montant total des soins engagés
            </p>
          </motion.div>

          {/* Card 2: Total Encaissé */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Total Encaissé
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {loading ? (
                <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${Number(data?.totalEncaisse || 0).toLocaleString("fr-FR")} DZD`
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Paiements réels perçus en trésorerie
            </p>
          </motion.div>

          {/* Card 3: Reste à Recouvrer */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="p-5 rounded-2xl bg-white border border-rose-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Reste à Recouvrer
              </span>
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-700">
              {loading ? (
                <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${Number(data?.resteARecouvrer || 0).toLocaleString("fr-FR")} DZD`
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Crédits dus par les patients
            </p>
          </motion.div>

          {/* Card 4: Traitements */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="p-5 rounded-2xl bg-white border border-teal-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                Soins en Cours
              </span>
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-teal-800">
              {loading ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                data?.countEnCours || 0
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {data?.countTermine || 0} terminés · {data?.countAnnule || 0} annulés
            </p>
          </motion.div>
        </div>

        {/* ======================================================== */}
        {/* CHARTS SECTION */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Évolution mensuelle des encaissements */}
          <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[var(--color-600)]" />
                    Évolution des Encaissements Mensuels
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Activité de trésorerie sur les 6 derniers mois
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              <div className="h-64 w-full">
                {loading ? (
                  <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl" />
                ) : data?.activitePaiements?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.activitePaiements}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenu" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--mycolor-600, #059669)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--mycolor-600, #059669)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(val) => [
                          `${Number(val).toLocaleString("fr-FR")} DZD`,
                          "Encaissé",
                        ]}
                        contentStyle={{
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="montant"
                        stroke="var(--mycolor-600, #059669)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="urlColorRevenu"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Aucune donnée d'encaissement disponible.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Top Soins Dentaires par CA */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Top Actes par Chiffre d'Affaires
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Prestations les plus rentables
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 flex-1 overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-xl" />
                ))
              ) : data?.topTraitements?.length > 0 ? (
                data.topTraitements.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                        {item.description}
                      </span>
                      <span className="font-bold text-[var(--color-700)]">
                        {Number(item.revenuTotal).toLocaleString("fr-FR")} DZD
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{item.count} séance(s) réalisée(s)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (item.revenuTotal /
                                (data.topTraitements[0]?.revenuTotal || 1)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">
                  Aucun traitement enregistré.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ======================================================== */}
        {/* TABLES: TOP DEBTORS & RECENT PAYMENTS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table 1: Top Débiteurs (Crédits patients en attente) */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Crédits Patients à Recouvrer
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Patients avec le solde débiteur le plus élevé
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                      <div className="h-4 w-32 bg-slate-100 rounded" />
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </div>
                  ))
                ) : data?.patientsDebiteurs?.length > 0 ? (
                  data.patientsDebiteurs.map((deb) => (
                    <div
                      key={deb.patientId}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">
                            {deb.nom}
                          </div>
                          <div className="text-xs text-slate-500">
                            Total soins:{" "}
                            {Number(deb.totalDu).toLocaleString("fr-FR")} DZD ·
                            Payé:{" "}
                            {Number(deb.totalPaye).toLocaleString("fr-FR")} DZD
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800">
                          {Number(deb.reste).toLocaleString("fr-FR")} DZD
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    🎉 Aucun crédit impayé ! Tous les patients sont à jour.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table 2: Derniers Versements Enregistrés */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Derniers Versements Encaissés
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique des encaissements récents
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                      <div className="h-4 w-32 bg-slate-100 rounded" />
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </div>
                  ))
                ) : data?.recentVersements?.length > 0 ? (
                  data.recentVersements.map((pmt) => (
                    <div
                      key={pmt.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">
                            {pmt.patientNom}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{pmt.traitementDesc}</span>
                            {pmt.dent && (
                              <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                Dent {pmt.dent}
                              </span>
                            )}
                            <span>·</span>
                            <span>
                              {new Date(pmt.date).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-700">
                          +{Number(pmt.montant).toLocaleString("fr-FR")} DZD
                        </span>
                        {pmt.note && (
                          <div className="text-[11px] text-slate-400 max-w-[120px] truncate">
                            {pmt.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Aucun versement récent enregistré.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

