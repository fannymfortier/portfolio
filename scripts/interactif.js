/* =========================================================
   INTERACTIF.JS — Point d'entrée
   ---------------------------------------------------------
   1. Thème clair / sombre
   2. Menu mobile
   3. Langue FR / EN
   4. Lightbox
   5. Apparition au scroll
   6. Initialisation
   Les projets (grille, filtre, page projet) sont dans projet.js
   ========================================================= */

import {
  CLE_STOCKAGE_THEME,
  CLE_STOCKAGE_LANGUE,
  lireStockage,
  ecrireStockage,
  langueCourante,
  definirLangue,
  traduire,
  chargerTraductions,
  appliquerTraductions
} from "./utilitaire.js";
import { decouperEnLettres, suivreChargement } from "./templates.js";
import { chargerProjets, initialiserFiltres, afficherLesProjets } from "./projet.js";


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
  afficherLesProjets();
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
   4. LIGHTBOX
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
   5. APPARITION AU SCROLL
   ---------------------------------------------------------
   Les éléments entrent avec un rebond quand ils arrivent
   à l'écran. Sans JS, tout reste simplement visible.
   ========================================================= */
const SELECTEUR_APPARITION = [
  ":is(.projets__entete, .apropos__entete, .contact__entete) h2",
  ".filtre-projets",
  ".carte-projet",
  ".apropos__photo",
  ".apropos__contenu > *",
  "#contact .conteneur > p",
  ".contact__liste li",
  ".projet__couverture",
  ".projet__blocs > *",
  ".projet__suivant .conteneur > *"
].join(", ");

const observateurApparition = new IntersectionObserver((entrees) => {
  entrees.forEach((entree) => {
    if (!entree.isIntersecting) return;
    entree.target.classList.add("apparition--visible");
    observateurApparition.unobserve(entree.target);
  });
}, { rootMargin: "0px 0px -10% 0px" });

function preparerApparitions() {
  document.querySelectorAll(SELECTEUR_APPARITION).forEach((element) => {
    if (element.classList.contains("apparition")) return;

    // Les voisins entrent en cascade
    const rang = [...element.parentElement.children].indexOf(element) % 4;
    element.style.setProperty("--rang", rang);

    element.classList.add("apparition");
    observateurApparition.observe(element);
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
initialiserFiltres();
initialiserLightbox();
preparerApparitions();

const portrait = document.querySelector(".apropos__photo img");
if (portrait) suivreChargement(portrait, portrait.parentElement);
document.addEventListener("contenu-ajoute", preparerApparitions);
chargerProjets();

document.getElementById("annee-courante").textContent = new Date().getFullYear();