"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Stethoscope,
  Users,
  Activity,
  FileText,
  Pill,
  TestTube,
  Syringe,
  ShieldCheck,
  Code2,
  Phone,
  Mail,
  MapPin,
  Star,
  MessageSquare,
  Send,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Layers,
  Heart,
  Globe,
  Database,
  Calendar,
  Clock,
  ThumbsUp,
  Cpu,
  Smartphone,
  ExternalLink,
  ArrowRight,
  Play,
  DollarSign,
  ImageIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import param from "@/param.json";

// === Carousel Slides Data (Fonctionnalités Réelles du Cabinet Dentaire) ===
const CAROUSEL_SLIDES = [
  {
    id: 1,
    title: "Gestion des Soins & Traitements Dentaires",
    subtitle: "Plans de traitement par dent & Suivi multi-séances",
    desc: "Création et suivi des plans de traitement avec numérotation dentaire FDI (endodontie, prothèses, chirurgie, composites, implants). Enregistrement des actes réalisés par séance avec modal détaillée et bouton continuer.",
    badge: "Odontologie & Actes",
    icon: Sparkles,
    color: "from-blue-600 to-cyan-500",
  },
  {
    id: 2,
    title: "Suivi Financier & Versements Échelonnés",
    subtitle: "Acomptes, Règlements par tranche & Contrôle des dettes",
    desc: "Suivi rigoureux de la trésorerie patient : calcul instantané du total dû, total payé et du crédit restant. Gestion des versements liés à un soin ou libres avec contrôle anti-dépassement.",
    badge: "Finances & Crédits",
    icon: DollarSign,
    color: "from-emerald-600 to-teal-500",
  },
  {
    id: 3,
    title: "Consultations & Dossier Patient Intégré",
    subtitle: "Examen clinique, Motif & Synthèse en temps réel",
    desc: "Centralisation des antécédents, observations cliniques et synthèse directe (dernier traitement, dernier versement, traitement en cours et solde dû). Impression immédiate post-sauvegarde.",
    badge: "Consultation Pro",
    icon: Stethoscope,
    color: "from-indigo-600 to-violet-500",
  },
  {
    id: 4,
    title: "Prescriptions & Ordonnances Numériques",
    subtitle: "Recettes types prédéfinies & Impression instantanée",
    desc: "Génération rapide d'ordonnances avec posologies, fréquences et durées adaptées. Bibliothèque de recettes types (avulsion, abcès, implantologie) et impression avec en-tête officiel du cabinet.",
    badge: "Prescription Rapide",
    icon: Pill,
    color: "from-purple-600 to-pink-500",
  },
  {
    id: 5,
    title: "Imagerie, Radiographies & Bilans de Laboratoire",
    subtitle: "Archivage sécurisé des clichés dentaires et analyses",
    desc: "Stockage et visionneuse des radiographies numériques (panoramiques OPG, rétro-alvéolaires, Cône Beam 3D) et prescription de bilans pré-opératoires avec archivage des comptes-rendus PDF.",
    badge: "Radiologie & Analyses",
    icon: TestTube,
    color: "from-amber-600 to-orange-500",
  },
  {
    id: 6,
    title: "Justifications Médicales, Agenda & Statistiques",
    subtitle: "Certificats d'arrêt, Planning des RDV & Tableaux de bord",
    desc: "Édition de certificats médicaux et dispenses post-opératoires, gestion du calendrier des rendez-vous et tableau de bord analytique de l'activité quotidienne, hebdomadaire et mensuelle.",
    badge: "Pilotage & Administration",
    icon: Calendar,
    color: "from-rose-600 to-red-500",
  },
];

// === Real Features Data Grid ===
const FEATURES = [
  {
    icon: Sparkles,
    title: "Plans de Traitement & Actes par Dent",
    desc: "Définition des soins par dent (FDI), suivi par séance clinique avec actes réalisés, statut dynamique (En cours, Terminé, Annulé) et modal de consultation détaillée.",
  },
  {
    icon: DollarSign,
    title: "Gestion Financière & Crédits Patients",
    desc: "Suivi des versements échelonnés (acomptes et soldes), calcul automatique du total dû, total payé et dette restante avec historique complet filtrable.",
  },
  {
    icon: Stethoscope,
    title: "Dossier Patient & Synthèse Clinique",
    desc: "Fiche médicale exhaustive avec antécédents, synthèse instantanée du traitement en cours, dernier versement et crédit en attente pour une prise en charge rapide.",
  },
  {
    icon: Pill,
    title: "Ordonnances & Recettes Types",
    desc: "Bibliothèque thérapeutique dentaire, protocoles d'ordonnances types pré-enregistrés, édition de lignes et impression A4/A5 instantanée post-consultation.",
  },
  {
    icon: ImageIcon,
    title: "Radiologie & Clichés Numériques",
    desc: "Archivage et visualisation des radiographies (panoramiques OPG, rétro-alvéolaires, CBCT 3D) rattachées directement aux consultations et au patient.",
  },
  {
    icon: TestTube,
    title: "Bilans de Laboratoire & Analyses",
    desc: "Prescription d'examens complémentaires (hémostase, glycémie, NFS), modèles de bilans pré-chirurgicaux et attachement de fichiers PDF de laboratoire.",
  },
  {
    icon: FileText,
    title: "Justifications & Certificats Médicaux",
    desc: "Modèles types d'arrêts de travail et dispenses post-avulsion ou soins chirurgicaux avec impression personnalisée aux normes du cabinet.",
  },
  {
    icon: Calendar,
    title: "Agenda & Prise de Rendez-Vous",
    desc: "Organisation des visites, rendez-vous du jour, séances de soins planifiées et rappels de contrôle post-opératoire rattachés au patient.",
  },
  {
    icon: Activity,
    title: "Tableau de Bord & Analytique",
    desc: "Statistiques en temps réel : nombre de consultations, actes les plus pratiqués, flux horaire des visites et suivi de l'activité du cabinet dentaire.",
  },
];

// === Initial Reviews Data ===
const INITIAL_REVIEWS = [
  {
    id: 1,
    name: "Dr. Amine M.",
    role: "Chirurgien Dentiste Titulaire",
    avatar: "AM",
    rating: 5,
    date: "28 Août 2026",
    comment:
      "Une solution logicielle sur-mesure d'une efficacité remarquable. Le gain de temps sur le suivi des soins par dent et la gestion des versements échelonnés est énorme au quotidien.",
    verified: true,
  },
  {
    id: 2,
    name: "Secrétariat Médical Cabinet",
    role: "Gestion Accueil & Règlements",
    avatar: "SM",
    rating: 5,
    date: "25 Août 2026",
    comment:
      "L'interface est très agréable et réactive. La recherche des patients, l'enregistrement des versements et l'impression directe des ordonnances et justificatifs se font en quelques secondes !",
    verified: true,
  },
  {
    id: 3,
    name: "Dr. Karim B.",
    role: "Chirurgien Dentiste Collaborateur",
    avatar: "KB",
    rating: 5,
    date: "15 Août 2026",
    comment:
      "Excellente gestion des plans de traitement multi-séances, de l'imagerie dentaire et de l'historique par dent. La double utilisation en version Web locale et application de bureau Electron est un vrai atout.",
    verified: true,
  },
];

// === Animation Variants with viewport once: false ===
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

export default function AproposPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedField, setCopiedField] = useState(null);
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [filterRating, setFilterRating] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // New review form state
  const [newReview, setNewReview] = useState({
    name: "",
    role: "Visiteur / Professionnel de santé",
    rating: 5,
    comment: "",
  });

  // Skeleton loading on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto slide carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text, fieldName) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) return;

    const initials = newReview.name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const created = {
      id: Date.now(),
      name: newReview.name.trim(),
      role: newReview.role.trim() || "Utilisateur Web",
      avatar: initials || "US",
      rating: Number(newReview.rating),
      date: "Aujourd'hui",
      comment: newReview.comment.trim(),
      verified: true,
    };

    setReviews([created, ...reviews]);
    setNewReview({
      name: "",
      role: "Visiteur / Professionnel de santé",
      rating: 5,
      comment: "",
    });
    setFeedbackSuccess(true);
    setIsDialogOpen(false);
    setTimeout(() => setFeedbackSuccess(false), 4000);
  };

  const filteredReviews =
    filterRating === 0
      ? reviews
      : reviews.filter((r) => r.rating === filterRating);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-50)] via-white to-[var(--color-100)] py-4 px-4 sm:px-6 lg:px-10 text-gray-800">
      {/* ======================================================== */}
      {/* 0. STANDALONE TOP NAVIGATION BAR */}
      {/* ======================================================== */}
      <header className="max-w-7xl mx-auto mb-8 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-[var(--color-200)] shadow-md flex items-center justify-between sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--color-500)] to-[var(--color-700)] flex items-center justify-center text-white shadow-md">
            <Image
              src="/amel.png"
              alt="Cabinet Logo"
              width={45}
              height={45}
            />{" "}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {param.cabinetName || "Cabinet Dentaire"}
            </h2>
            <p className="text-xs text-[var(--color-600)] font-semibold">
              {param.doctorName || "Docteur"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/Accueill")}
            className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl font-semibold shadow-md flex items-center gap-2 text-xs sm:text-sm px-4 py-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span className="hidden sm:inline">Accéder à</span> l'Application
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-16">
        {/* ======================================================== */}
        {/* 1. HERO HEADER SECTION WITH TEST APP CTA */}
        {/* ======================================================== */}
        <motion.section
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="relative text-center space-y-6 pt-2 pb-6 overflow-hidden"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-100)] border border-[var(--color-300)] text-[var(--color-700)] text-sm font-semibold shadow-sm">
            <Sparkles className="w-4 h-4 text-[var(--color-600)] animate-spin-slow" />
            <span>Plateforme Médicale Dentaire & Système de Gestion</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight max-w-4xl mx-auto leading-tight">
            {param.cabinetName || "Cabinet Dentaire"}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-600)] to-[var(--color-400)]">
              {param.doctorName || "Docteur"}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Application médicale complète conçue pour digitaliser l'ensemble des
            processus cliniques du cabinet dentaire : dossiers patients, plans de
            traitement et actes par dent, gestion financière et versements
            échelonnés, ordonnances normalisées, radiographies et statistiques en
            temps réel.
          </p>

          {/* PRIMARY CTA BUTTON: TESTER L'APPLICATION */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push("/Accueill")}
              className="px-8 py-6 text-base sm:text-lg font-bold rounded-2xl bg-gradient-to-r from-[var(--color-600)] to-[var(--color-500)] hover:from-[var(--color-700)] hover:to-[var(--color-600)] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-3 cursor-pointer group"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Tester l'Application</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Mode Web & Desktop Electron
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              PostgreSQL Haute Performance
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Impression A4 / A5 & Sauvegardes
            </span>
          </div>
        </motion.section>

        {/* ======================================================== */}
        {/* 2. INTERACTIVE CAROUSEL SHOWCASE */}
        {/* ======================================================== */}
        <motion.section
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--color-200)] pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                <Layers className="w-6 h-6 text-[var(--color-600)]" />
                Galerie & Fonctionnalités Clés
              </h2>
              <p className="text-sm text-gray-500">
                Découvrez les modules principaux intégrés dans le système
              </p>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentSlide((prev) =>
                    prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1,
                  )
                }
                className="h-9 w-9 rounded-full border-gray-300 hover:bg-[var(--color-100)] text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length)
                }
                className="h-9 w-9 rounded-full border-gray-300 hover:bg-[var(--color-100)] text-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Card className="p-8 border border-gray-200">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            </Card>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-200)] bg-white shadow-xl">
              <AnimatePresence mode="wait">
                {CAROUSEL_SLIDES.map((slide, index) => {
                  if (index !== currentSlide) return null;
                  const Icon = slide.icon;

                  return (
                    <motion.div
                      key={slide.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.45, ease: "easeInOut" }}
                      className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]"
                    >
                      {/* Left: Info details */}
                      <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-100)] text-[var(--color-700)]">
                            <Icon className="w-3.5 h-3.5" />
                            {slide.badge}
                          </div>

                          <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                            {slide.title}
                          </h3>

                          <h4 className="text-base font-semibold text-[var(--color-600)]">
                            {slide.subtitle}
                          </h4>

                          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                            {slide.desc}
                          </p>
                        </div>

                        {/* Slide Indicators & Quick Test Link */}
                        <div className="flex items-center justify-between pt-4">
                          <div className="flex items-center gap-2">
                            {CAROUSEL_SLIDES.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                  i === currentSlide
                                    ? "w-8 bg-[var(--color-600)]"
                                    : "w-2.5 bg-gray-200 hover:bg-gray-300"
                                }`}
                                aria-label={`Aller au slide ${i + 1}`}
                              />
                            ))}
                          </div>

                          <Button
                            onClick={() => router.push("/Accueill")}
                            variant="ghost"
                            className="text-xs font-bold text-[var(--color-600)] hover:text-[var(--color-700)] hover:bg-[var(--color-50)] gap-1 p-2"
                          >
                            <span>Tester ce module</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Right: Visual Mockup Showcase */}
                      <div
                        className={`lg:col-span-6 bg-gradient-to-br ${slide.color} p-8 flex items-center justify-center relative overflow-hidden`}
                      >
                        {/* Background decorative circles */}
                        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-xl" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-black/10 blur-xl" />

                        {/* Interactive Mockup Graphic */}
                        <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-xl p-5 shadow-2xl border border-white/40 space-y-4 text-gray-800">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-rose-500" />
                              <div className="w-3 h-3 rounded-full bg-amber-500" />
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500">
                              Cabinet Dentaire v4.0
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-[var(--color-100)] text-[var(--color-600)]">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {slide.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                Statut : Opérationnel & Sécurisé
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                              <span className="text-gray-500 block">
                                Fréquence d'utilisation
                              </span>
                              <span className="font-bold text-gray-900">
                                Continue (24/7)
                              </span>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                              <span className="text-gray-500 block">
                                Base de données
                              </span>
                              <span className="font-bold text-emerald-600">
                                PostgreSQL
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-[var(--color-50)] border border-[var(--color-200)] text-xs text-[var(--color-800)] font-medium flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>Accessible en Web & Electron</span>
                            </div>
                            <Button
                              onClick={() => router.push("/Accueill")}
                              size="sm"
                              className="h-7 text-xs bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-lg px-2.5"
                            >
                              Ouvrir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        {/* ======================================================== */}
        {/* 3. CORE FEATURES GRID */}
        {/* ======================================================== */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.15 }}
          className="space-y-6"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Architecture & Atouts Techniques
            </h2>
            <p className="text-sm text-gray-600">
              Des technologies de pointe garantissant rapidité, ergonomie et
              sécurité
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-10 w-10 rounded-xl mb-4" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </Card>
                ))
              : FEATURES.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div key={i} variants={fadeInUp}>
                      <Card className="h-full border border-gray-200 hover:border-[var(--color-300)] hover:shadow-lg transition-all duration-300 group bg-white/80 backdrop-blur-sm">
                        <CardHeader className="space-y-3">
                          <div className="p-3 rounded-xl bg-[var(--color-100)] text-[var(--color-600)] w-fit group-hover:bg-[var(--color-600)] group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Icon className="w-6 h-6" />
                          </div>
                          <CardTitle className="text-lg font-bold text-gray-900">
                            {feat.title}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600 leading-relaxed">
                            {feat.desc}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>
        </motion.section>

        {/* ======================================================== */}
        {/* 4. DEVELOPER PROFILE SECTION */}
        {/* ======================================================== */}
        <motion.section
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="space-y-6"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-100)] text-[var(--color-700)]">
              <Code2 className="w-3.5 h-3.5" />
              <span>Ingénierie & Développement</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Informations du Développeur
            </h2>
            <p className="text-sm text-gray-600">
              Conception, réalisation et maintenance logicielle
            </p>
          </div>

          <Card className="border border-[var(--color-200)] shadow-xl overflow-hidden bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Dev Info Column */}
              <div className="lg:col-span-5 bg-gradient-to-br from-[var(--color-700)] to-[var(--color-900)] p-8 sm:p-10 text-white flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl font-bold shadow-inner">
                    MS
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Mossaab SDJ
                    </h3>
                    <p className="text-sm text-[var(--color-200)] font-medium">
                      Mossaab Saad Djaballah
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                      Full-Stack Software Engineer & Medical Systems Architect
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-white/80">
                    <MapPin className="w-4 h-4 text-[var(--color-300)] flex-shrink-0" />
                    <span>Algérie / Skikda</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Phone className="w-4 h-4 text-[var(--color-300)] flex-shrink-0" />
                    <span>+213 (0) 556 27 03 94</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Mail className="w-4 h-4 text-[var(--color-300)] flex-shrink-0" />
                    <span>saadsdj0@gmail.com</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {[
                    "Next.js",
                    "React",
                    "Tailwind CSS",
                    "PostgreSQL",
                    "Node.js",
                    "Prisma",
                    "Framer Motion",
                    "Electron",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-0.5 rounded-md bg-white/15 text-[11px] font-medium text-white/90"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dev Contact Action Cards Column */}
              <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-[var(--color-600)]" />
                    Coordonnées Directes & Support
                  </h4>
                  <p className="text-sm text-gray-600">
                    Pour toute assistance technique, personnalisation de modules
                    ou développement de fonctionnalités spécifiques pour votre
                    cabinet, vous pouvez contacter directement le développeur :
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Contact Card */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-[var(--color-300)] hover:shadow-md transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                        <Phone className="w-5 h-5" />
                      </div>
                      <button
                        onClick={() => handleCopy("0556270394", "phone")}
                        className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
                        title="Copier le numéro"
                      >
                        {copiedField === "phone" ? (
                          <span className="text-emerald-600 flex items-center gap-0.5 font-bold">
                            <Check className="w-3 h-3" /> Copié !
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <Copy className="w-3 h-3" /> Copier
                          </span>
                        )}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">
                        Téléphone direct
                      </div>
                      <a
                        href="tel:0556270394"
                        className="text-base font-bold text-gray-900 hover:text-[var(--color-600)] transition-colors"
                      >
                        0556 27 03 94
                      </a>
                    </div>
                  </div>

                  {/* Email Contact Card */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-[var(--color-300)] hover:shadow-md transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                        <Mail className="w-5 h-5" />
                      </div>
                      <button
                        onClick={() =>
                          handleCopy("saadsdj0@gmail.com", "email")
                        }
                        className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
                        title="Copier l'email"
                      >
                        {copiedField === "email" ? (
                          <span className="text-blue-600 flex items-center gap-0.5 font-bold">
                            <Check className="w-3 h-3" /> Copié !
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <Copy className="w-3 h-3" /> Copier
                          </span>
                        )}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">
                        Email professionnel
                      </div>
                      <a
                        href="mailto:saadsdj0@gmail.com"
                        className="text-sm font-bold text-gray-900 hover:text-[var(--color-600)] transition-colors truncate block"
                      >
                        saadsdj0@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* Location Card */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 w-fit mb-2">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      Localisation
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      Algérie / Skikda
                    </div>
                  </div>

                  {/* Availability Card */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700 w-fit mb-2">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      Disponibilité
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      Support technique & Mises à jour
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ======================================================== */}
        {/* 5. REVIEWS & FEEDBACKS SECTION */}
        {/* ======================================================== */}
        <motion.section
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.15 }}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-[var(--color-200)] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 mb-2">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Retours d'Expérience & Avis</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Avis & Témoignages
              </h2>
              <p className="text-sm text-gray-600">
                Découvrez les retours des praticiens et laissez votre propre
                évaluation
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Rating Filter Buttons */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setFilterRating(0)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterRating === 0
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Tous ({reviews.length})
                </button>
                <button
                  onClick={() => setFilterRating(5)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    filterRating === 5
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  5 <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </button>
              </div>

              {/* Add Feedback Button */}
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white flex items-center gap-2 rounded-xl shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Donner mon avis
              </Button>
            </div>
          </div>

          {/* Feedback Success Notification */}
          {feedbackSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              Merci pour votre précieux retour ! Votre avis a été publié avec
              succès.
            </motion.div>
          )}

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </Card>
                ))
              : filteredReviews.map((rev) => (
                  <motion.div
                    key={rev.id}
                    variants={fadeInUp}
                    layout
                    className="h-full"
                  >
                    <Card className="h-full flex flex-col justify-between border border-gray-200 bg-white hover:shadow-lg transition-all duration-300">
                      <CardHeader className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-100)] text-[var(--color-700)] font-bold flex items-center justify-center text-sm shadow-sm">
                              {rev.avatar}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                {rev.name}
                                {rev.verified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {rev.role}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rev.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-gray-700 ml-1.5">
                            {rev.rating}.0
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed italic">
                          "{rev.comment}"
                        </p>
                      </CardHeader>

                      <CardFooter className="pt-0 text-xs text-gray-400 font-medium flex items-center justify-between border-t border-gray-50 mt-4 pt-3">
                        <span>Publié le {rev.date}</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <ThumbsUp className="w-3 h-3" /> Recommandé
                        </span>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
          </div>
        </motion.section>

        {/* ======================================================== */}
        {/* 6. DIALOG MODAL FOR SUBMITTING FEEDBACK */}
        {/* ======================================================== */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[var(--color-700)] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--color-600)]" />
                Partagez votre avis sur l'application
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Vos commentaires permettent d'améliorer continuellement
                l'expérience d'utilisation du cabinet.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReviewSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Votre Nom & Prénom *
                </label>
                <Input
                  required
                  placeholder="Ex: Dr. Ahmed S."
                  value={newReview.name}
                  onChange={(e) =>
                    setNewReview({ ...newReview, name: e.target.value })
                  }
                  className="rounded-xl border-gray-300 focus:ring-2 focus:ring-[var(--color-500)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Votre Rôle ou Titre
                </label>
                <Input
                  placeholder="Ex: Chirurgien Dentiste / Secrétaire / Visiteur"
                  value={newReview.role}
                  onChange={(e) =>
                    setNewReview({ ...newReview, role: e.target.value })
                  }
                  className="rounded-xl border-gray-300 focus:ring-2 focus:ring-[var(--color-500)]"
                />
              </div>

              {/* Star Rating Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Votre Note Globale *
                </label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() =>
                        setNewReview({ ...newReview, rating: star })
                      }
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= newReview.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-gray-700 ml-2">
                    {newReview.rating} / 5 étoiles
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Votre Commentaire / Avis *
                </label>
                <Textarea
                  required
                  rows={4}
                  placeholder="Partagez vos impressions sur la rapidité, l'ergonomie, l'impression ou les fonctionnalités..."
                  value={newReview.comment}
                  onChange={(e) =>
                    setNewReview({ ...newReview, comment: e.target.value })
                  }
                  className="rounded-xl border-gray-300 focus:ring-2 focus:ring-[var(--color-500)]"
                />
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Publier l'avis
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
