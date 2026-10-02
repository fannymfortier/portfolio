/* =========================================================
   INTERACTIF.JS — Point d'entrée
   ---------------------------------------------------------
   1. Thème clair / sombre
   2. Menu mobile
   3. Langue FR / EN
   4. Rendu des projets (data/projects.json)
   5. Lightbox
   6. Initialisation
   ========================================================= */

import {
  CLE_STOCKAGE_THEME,
  CLE_STOCKAGE_LANGUE,
  CHEMIN_PROJETS,
  FILTRE_TOUS,
  lireStockage,
  ecrireStockage,
  langueCourante,
  definirLangue,
  traduire,
  chargerTraductions,
  appliquerTraductions,
  texteDe,
  chargerJSON,
  normaliser
} from "./utilitaire.js";
import { creerCarteProjet, creerBoutonFiltre, creerMessageGrille, decouperEnLettres } from "./templates.js";
import { afficherPageProjet } from "./projet.js";

// État de la page
let listeProjets = [];
let projetsCharges = false;
let filtreCourant = FILTRE_TOUS;
let rechercheCourante = "";


/* =========================================================
   1. THÈME CLAIR / SOMBRE
   ---------------------------------------------------------
   Bascule .dark-theme sur <body>. Le CSS s'occupe du reste
   via les variables redéfinies dans .dark-theme.
   ========================================================= */
const boutonTheme = document.getElementById("bouton-theme");

function appliquerTheme(estSombre) {
  document.body.classList.toggle("dark-theme", estSombre);

  // Le bouton annonce l'action à venir : "Mode clair" quand on est en sombre
  boutonTheme.setAttribute("aria-pressed", String(estSombre));
  const texteBouton = boutonTheme.querySelector("[data-i18n]");
  texteBouton.dataset.i18n = estSombre ? "controles.theme.clair" : "controles.theme";
  texteBouton.textContent = traduire(texteBouton.dataset.i18n);
}

function initialiserTheme() {
  const themeSauvegarde = lireStockage(CLE_STOCKAGE_THEME);

  // Préférence système par défaut
  const estSombre = themeSauvegarde
    ? themeSauvegarde === "sombre"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;

  appliquerTheme(estSombre);

  boutonTheme.addEventListener("click", () => {
    const devientSombre = !document.body.classList.contains("dark-theme");
    appliquerTheme(devientSombre);
    ecrireStockage(CLE_STOCKAGE_THEME, devientSombre ? "sombre" : "clair");
  });
}


/* =========================================================
   2. MENU MOBILE
   ========================================================= */
const boutonMenu = document.getElementById("bouton-menu");
const navigation = document.getElementById("navigation-principale");
const ecranMobile = window.matchMedia("(max-width: 48rem)");

function basculerMenu(ouvrir) {
  navigation.classList.toggle("navigation--ouverte", ouvrir);
  document.body.classList.toggle("menu-ouvert", ouvrir);
  document.querySelector("main").inert = ouvrir;
  document.querySelector(".pied").inert = ouvrir;

  boutonMenu.setAttribute("aria-expanded", String(ouvrir));
  const texteBouton = boutonMenu.querySelector("[data-i18n]");
  texteBouton.dataset.i18n = ouvrir ? "menu.fermer" : "menu.ouvrir";
  texteBouton.textContent = traduire(texteBouton.dataset.i18n);
}

function menuEstOuvert() {
  return boutonMenu.getAttribute("aria-expanded") === "true";
}

function initialiserMenu() {
  boutonMenu.addEventListener("click", () => basculerMenu(!menuEstOuvert()));

  navigation.addEventListener("click", (evenement) => {
    if (evenement.target.closest("a")) basculerMenu(false);
  });

  document.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Escape" && menuEstOuvert()) {
      basculerMenu(false);
      boutonMenu.focus();
    }
  });

  ecranMobile.addEventListener("change", () => basculerMenu(false));
}


/* =========================================================
   3. LANGUE FR / EN
   ========================================================= */
const boutonLangue = document.getElementById("bouton-langue");

function changerLangue(nouvelleLangue) {
  definirLangue(nouvelleLangue);
  ecrireStockage(CLE_STOCKAGE_LANGUE, nouvelleLangue);
  appliquerTraductions();
  document.querySelectorAll("[data-i18n-lettres]").forEach(decouperEnLettres);
  afficherTout();
}

function initialiserLangue() {
  const langueSauvegardee = lireStockage(CLE_STOCKAGE_LANGUE);
  if (langueSauvegardee) definirLangue(langueSauvegardee);

  appliquerTraductions();
  document.querySelectorAll("[data-i18n-lettres]").forEach(decouperEnLettres);

  boutonLangue.addEventListener("click", () => {
    changerLangue(langueCourante === "fr" ? "en" : "fr");
  });
}


/* =========================================================
   4. RENDU DES PROJETS
   ---------------------------------------------------------
   Cloner le template de projet pour chaque projet (templates.js)
   ========================================================= */
const grilleProjets = document.getElementById("grille-projets");
const filtreCategories = document.getElementById("filtre-categories");
const champRecherche = document.getElementById("recherche-projets");
const statutProjets = document.getElementById("statut-projets");
const pageProjet = document.getElementById("page-projet");
const idProjet = new URLSearchParams(window.location.search).get("id");

async function chargerProjets() {
  try {
    listeProjets = await chargerJSON(CHEMIN_PROJETS);
    projetsCharges = true;
    afficherTout();
  } catch (erreur) {
    console.error("Erreur de chargement des projets :", erreur);
    if (grilleProjets) afficherMessageGrille("projets.erreur");
    if (pageProjet) afficherPageProjet(null, idProjet);
  }
}

// Accueil : grille et filtres. Page projet : le projet demandé dans l'URL.
function afficherTout() {
  if (!projetsCharges) return;

  if (grilleProjets) {
    afficherFiltres();
    afficherProjets();
  }

  if (pageProjet) {
    afficherPageProjet(listeProjets, idProjet);
  }
}

function afficherMessageGrille(cle) {
  grilleProjets.replaceChildren(creerMessageGrille(cle));
}

function afficherProjets() {
  if (!projetsCharges) return;

  if (listeProjets.length === 0) {
    afficherMessageGrille("projets.vide");
    return;
  }

  const projetsVisibles = listeProjets.filter(correspondAuFiltre);
  statutProjets.textContent = traduire("projets.compte").replace("{n}", projetsVisibles.length);

  if (projetsVisibles.length === 0) {
    afficherMessageGrille("projets.aucunResultat");
    return;
  }

  grilleProjets.replaceChildren(...projetsVisibles.map(creerCarteProjet));
  grilleProjets.scrollLeft = 0;
}

// Filtre et recherche
function afficherFiltres() {
  if (!projetsCharges) return;

  const categories = [FILTRE_TOUS, ...new Set(listeProjets.map((projet) => projet.category))];

  const boutons = categories.map((categorie) => creerBoutonFiltre(categorie, categorie === filtreCourant));

  filtreCategories.replaceChildren(...boutons);
}


function correspondAuFiltre(projet) {
  if (filtreCourant !== FILTRE_TOUS && projet.category !== filtreCourant) return false;
  if (!rechercheCourante) return true;

  const texte = [
    projet.title,
    texteDe(projet, "description"),
    traduire(`categorie.${projet.category}`),
    ...(projet.tags ?? [])
  ].join(" ");

  return normaliser(texte).includes(rechercheCourante);
}

function initialiserFiltres() {
  filtreCategories.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("[data-categorie]");
    if (!bouton) return;

    filtreCourant = bouton.dataset.categorie;
    filtreCategories.querySelectorAll("[data-categorie]").forEach((autre) => {
      autre.setAttribute("aria-pressed", String(autre === bouton));
    });
    afficherProjets();
  });

  champRecherche.addEventListener("input", () => {
    rechercheCourante = normaliser(champRecherche.value.trim());
    afficherProjets();
  });
}





/* =========================================================
   5. LIGHTBOX
   ---------------------------------------------------------
   N'importe quel élément avec data-lightbox="chemin/image.jpg"
   ouvre l'image en grand. Une seule écoute sur le document
   (délégation) : ça marche aussi pour les cartes générées
   après coup.
   ========================================================= */
const lightbox = document.getElementById("lightbox");
const imageLightbox = lightbox.querySelector(".lightbox__image");
const boutonFermer = lightbox.querySelector(".lightbox__fermer");

function ouvrirLightbox(source, texteAlternatif = "") {
  imageLightbox.src = source;
  imageLightbox.alt = texteAlternatif;
  lightbox.showModal();
}

function initialiserLightbox() {
  document.addEventListener("click", (evenement) => {
    const declencheur = evenement.target.closest("[data-lightbox]");
    if (!declencheur || !declencheur.dataset.lightbox) return;

    const texteAlternatif = declencheur.querySelector("img")?.alt || declencheur.getAttribute("aria-label") || "";
    ouvrirLightbox(declencheur.dataset.lightbox, texteAlternatif);
  });

  boutonFermer.addEventListener("click", () => lightbox.close());

  // Clic sur l'arrière-plan (le <dialog> lui-même, pas l'image) → fermer
  lightbox.addEventListener("click", (evenement) => {
    if (evenement.target === lightbox) lightbox.close();
  });

  // Vider l'image à la fermeture (Échap est géré nativement par <dialog>)
  lightbox.addEventListener("close", () => {
    imageLightbox.src = "";
    imageLightbox.alt = "";
  });
}


/* =========================================================
   6. INITIALISATION
   ========================================================= */
// Les lettres d'abord, pour ne pas attendre le chargement des traductions
document.querySelectorAll("[data-i18n-lettres]").forEach(decouperEnLettres);

await chargerTraductions();
initialiserLangue();
initialiserTheme();
initialiserMenu();
if (grilleProjets) initialiserFiltres();
initialiserLightbox();
chargerProjets();

document.getElementById("annee-courante").textContent = new Date().getFullYear();