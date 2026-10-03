/* =========================================================
   UTILITAIRE.JS — Outils partagés
   ---------------------------------------------------------
   1. Configuration
   2. localStorage sécurisé
   3. Langue et traductions
   4. Données
   ========================================================= */


/* =========================================================
   1. CONFIGURATION
   ========================================================= */
export const CLE_STOCKAGE_THEME = "portfolio-theme";
export const CLE_STOCKAGE_LANGUE = "portfolio-langue";
export const CHEMIN_PROJETS = "data/projects.json";
export const FILTRE_TOUS = "tous";

const CHEMIN_TRADUCTIONS = "data/translations.json";
const LANGUE_PAR_DEFAUT = "fr";


/* =========================================================
   2. LOCALSTORAGE SÉCURISÉ
   ========================================================= */
export /* ---------------------------------------------------------
   UTILITAIRE : localStorage sécurisé
   --------------------------------------------------------- */
function lireStockage(cle) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

export function ecrireStockage(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
  }
}


/* =========================================================
   3. LANGUE ET TRADUCTIONS
   ---------------------------------------------------------
   - data-i18n="cle" remplace le texte de l'élément
   - data-i18n-aria-label="cle" remplace son aria-label
   - data-i18n-content="cle" remplace son attribut content
   Les textes sont dans data/translations.json
   ========================================================= */
export let langueCourante = LANGUE_PAR_DEFAUT;
let traductions = { fr: {}, en: {} };

export function definirLangue(langue) {
  if (traductions[langue]) langueCourante = langue;
}

// Retourne la traduction d'une clé, ou la clé elle-même si elle manque
// (pratique pour repérer les oublis directement dans la page)
export function traduire(cle) {
  return traductions[langueCourante]?.[cle] ?? cle;
}

export async function chargerTraductions() {
  try {
    traductions = await chargerJSON(CHEMIN_TRADUCTIONS);
  } catch (erreur) {
    console.error("Erreur de chargement des traductions :", erreur);
  }
}

// Clé introuvable = on garde le texte du HTML
export function appliquerTraductions() {
  document.documentElement.lang = langueCourante;
  const dictionnaire = traductions[langueCourante] ?? {};

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const texte = dictionnaire[element.dataset.i18n];
    if (texte !== undefined) element.textContent = texte;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const texte = dictionnaire[element.dataset.i18nAriaLabel];
    if (texte !== undefined) element.setAttribute("aria-label", texte);
  });

  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    const texte = dictionnaire[element.dataset.i18nContent];
    if (texte !== undefined) element.setAttribute("content", texte);
  });
}

// Champ traduit, avec le français par défaut
export function texteDe(objet, champ) {
  return objet[`${champ}_${langueCourante}`] || objet[`${champ}_fr`] || "";
}


/* =========================================================
   4. DONNÉES
   ========================================================= */
export async function chargerJSON(chemin) {
  const reponse = await fetch(chemin);
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return reponse.json();
}

// "2026-05" → "Mai 2026" / "May 2026"
export function formaterDate(date) {
  if (!date) return "";
  const [annee, mois] = date.split("-").map(Number);
  if (!mois) return String(annee);

  const texte = new Date(annee, mois - 1).toLocaleDateString(langueCourante, { month: "long", year: "numeric" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Plus récent en premier, ou l'inverse. Sans date = toujours à la fin.
export function trierParDate(projets, ordre = "recent") {
  return [...projets].sort((a, b) => {
    if (!a.date || !b.date) return !a.date - !b.date;
    return ordre === "recent" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });
}

export function normaliser(texte) {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
