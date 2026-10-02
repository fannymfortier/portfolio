/* =========================================================
   MAIN.JS — Point d'entrée
   ---------------------------------------------------------
   1. Thème clair / sombre
   2. Menu mobile
   3. Langue FR / EN
   4. Rendu des projets (data/projects.json)
   5. Overlay projet
   6. Lightbox
   7. Initialisation
   ========================================================= */

import { traductions } from "./translations.js";


/* ---------------------------------------------------------
   CONFIGURATION
   --------------------------------------------------------- */
const CLE_STOCKAGE_THEME = "portfolio-theme";
const CLE_STOCKAGE_LANGUE = "portfolio-langue";
const CHEMIN_PROJETS = "data/projects.json";
const LANGUE_PAR_DEFAUT = "fr";

// État partagé entre les modules
let langueCourante = LANGUE_PAR_DEFAUT;
let listeProjets = [];
let projetsCharges = false;


/* ---------------------------------------------------------
   UTILITAIRE : localStorage sécurisé
   --------------------------------------------------------- */
function lireStockage(cle) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrireStockage(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
  }
}


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
   ---------------------------------------------------------
   Sous 48rem, la navigation devient un menu plein écran.
   Pendant qu'il est ouvert, le reste de la page est inerte.
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

  // Un lien choisi = on ferme pour voir la section
  navigation.addEventListener("click", (evenement) => {
    if (evenement.target.closest("a")) basculerMenu(false);
  });

  document.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Escape" && menuEstOuvert()) {
      basculerMenu(false);
      boutonMenu.focus();
    }
  });

  // Retour sur grand écran = menu fermé
  ecranMobile.addEventListener("change", () => basculerMenu(false));
}


/* =========================================================
   3. LANGUE FR / EN
   ---------------------------------------------------------
   - data-i18n="cle" remplace le texte de l'élément
   - data-i18n-aria-label="cle" remplace son aria-label
   ========================================================= */
const boutonLangue = document.getElementById("bouton-langue");

// Retourne la traduction d'une clé, ou la clé elle-même si elle manque
// (pratique pour repérer les oublis directement dans la page)
function traduire(cle) {
  return traductions[langueCourante]?.[cle] ?? cle;
}

function appliquerTraductions() {
  document.documentElement.lang = langueCourante;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = traduire(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", traduire(element.dataset.i18nAriaLabel));
  });
}

function changerLangue(nouvelleLangue) {
  langueCourante = nouvelleLangue;
  ecrireStockage(CLE_STOCKAGE_LANGUE, nouvelleLangue);
  appliquerTraductions();
  afficherProjets();
  if (projetOuvert) remplirOverlay(projetOuvert);
}

function initialiserLangue() {
  const langueSauvegardee = lireStockage(CLE_STOCKAGE_LANGUE);

  if (langueSauvegardee && traductions[langueSauvegardee]) {
    langueCourante = langueSauvegardee;
  }

  appliquerTraductions();

  boutonLangue.addEventListener("click", () => {
    changerLangue(langueCourante === "fr" ? "en" : "fr");
  });
}


/* =========================================================
   4. RENDU DES PROJETS
   ---------------------------------------------------------
   Cloner le template de projet pour chaque projet
   ========================================================= */
const grilleProjets = document.getElementById("grille-projets");
const gabaritCarte = document.getElementById("gabarit-carte-projet");

async function chargerProjets() {
  try {
    const reponse = await fetch(CHEMIN_PROJETS);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    listeProjets = await reponse.json();
    projetsCharges = true;
    afficherProjets();
  } catch (erreur) {
    console.error("Erreur de chargement des projets :", erreur);
    afficherMessageGrille("projets.erreur");
  }
}

function afficherMessageGrille(cle) {
  const message = document.createElement("p");
  message.className = "grille-projets__message";
  message.dataset.i18n = cle;
  message.textContent = traduire(cle);
  grilleProjets.replaceChildren(message);
}

function afficherProjets() {

  if (!projetsCharges) return;

  if (listeProjets.length === 0) {
    afficherMessageGrille("projets.vide");
    return;
  }

  const cartes = listeProjets.map(creerCarteProjet);
  grilleProjets.replaceChildren(...cartes);
}

function creerCarteProjet(projet) {
  const carte = gabaritCarte.content.firstElementChild.cloneNode(true);
  carte.id = `projet-${projet.id}`;

  // Vignette décorative : le titre suffit pour les lecteurs d'écran
  const image = carte.querySelector(".carte-projet__vignette img");
  cacherSiErreur(image, image);
  image.src = projet.thumbnail;

  // Le titre est un bouton étiré sur toute la carte (voir composants.css)
  const bouton = carte.querySelector(".carte-projet__bouton");
  bouton.textContent = projet.title;
  bouton.addEventListener("click", () => ouvrirProjet(projet));

  carte.querySelector(".carte-projet__categorie").textContent = traduire(`categorie.${projet.category}`);
  carte.querySelector(".carte-projet__description").textContent = descriptionDe(projet);
  remplirListe(carte.querySelector(".carte-projet__tags"), projet.tags, creerTag);

  return carte;
}

function descriptionDe(projet) {
  return projet[`description_${langueCourante}`] ?? projet.description_fr;
}

function creerTag(tag) {
  const item = document.createElement("li");
  item.textContent = tag;
  return item;
}

// Image introuvable : on cache l'élément au lieu d'une image brisée
function cacherSiErreur(image, elementACacher) {
  elementACacher.hidden = false;
  image.onerror = () => {
    elementACacher.hidden = true;
  };
}

// Liste vide = cachée (comme ça elle reste réutilisable dans l'overlay)
function remplirListe(liste, elements = [], creerItem) {
  liste.hidden = elements.length === 0;
  liste.replaceChildren(...elements.map(creerItem));
}


/* =========================================================
   5. OVERLAY PROJET
   ---------------------------------------------------------
   Un seul <dialog> réutilisé : on le remplit avec le
   projet cliqué, puis on l'ouvre.
   ========================================================= */
const overlay = document.getElementById("projet-overlay");
let projetOuvert = null;

function ouvrirProjet(projet) {
  projetOuvert = projet;
  remplirOverlay(projet);
  overlay.showModal();
  overlay.scrollTop = 0;
}

function remplirOverlay(projet) {
  // Grande image (ouvre la lightbox)
  const boutonImage = overlay.querySelector(".projet-overlay__image");
  const image = boutonImage.querySelector("img");
  cacherSiErreur(image, boutonImage);
  image.src = projet.thumbnail;
  image.alt = projet.title;
  boutonImage.dataset.lightbox = projet.thumbnail;
  boutonImage.setAttribute("aria-label", `${traduire("projets.agrandir")} : ${projet.title}`);

  // Textes
  overlay.querySelector(".projet-overlay__categorie").textContent = traduire(`categorie.${projet.category}`);
  overlay.querySelector(".projet-overlay__titre").textContent = projet.title;
  overlay.querySelector(".projet-overlay__description").textContent = descriptionDe(projet);
  remplirListe(overlay.querySelector(".projet-overlay__tags"), projet.tags, creerTag);

  // Galerie (chaque image ouvre la lightbox)
  remplirListe(overlay.querySelector(".projet-overlay__galerie"), projet.gallery_images, (source, index) => {
    const item = document.createElement("li");
    const bouton = document.createElement("button");
    const imageGalerie = document.createElement("img");

    bouton.type = "button";
    bouton.dataset.lightbox = source;
    bouton.setAttribute("aria-label", `${traduire("projets.agrandir")} : ${projet.title} (${index + 1})`);
    cacherSiErreur(imageGalerie, item);
    imageGalerie.src = source;
    imageGalerie.alt = "";
    imageGalerie.loading = "lazy";

    bouton.append(imageGalerie);
    item.append(bouton);
    return item;
  });

  // Liens (URL vide = ignoré)
  const liensValides = Object.entries(projet.links ?? {}).filter(([, url]) => url);
  remplirListe(overlay.querySelector(".projet-overlay__liens"), liensValides, ([type, url]) => {
    const item = document.createElement("li");
    const lien = document.createElement("a");
    lien.href = url;
    lien.target = "_blank";
    lien.rel = "noopener";
    lien.textContent = traduire(`lien.${type}`);
    item.append(lien);
    return item;
  });
}

function initialiserOverlay() {
  overlay.querySelector(".projet-overlay__fermer").addEventListener("click", () => overlay.close());

  // Clic à l'extérieur du contenu = fermer
  overlay.addEventListener("click", (evenement) => {
    if (evenement.target === overlay) overlay.close();
  });

  overlay.addEventListener("close", () => {
    projetOuvert = null;
  });
}


/* =========================================================
   6. LIGHTBOX
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
   7. INITIALISATION
   ========================================================= */
initialiserLangue();
initialiserTheme();
initialiserMenu();
initialiserOverlay();
initialiserLightbox();
chargerProjets();

document.getElementById("annee-courante").textContent = new Date().getFullYear();