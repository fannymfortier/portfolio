/* =========================================================
   MAIN.JS — Point d'entrée
   ---------------------------------------------------------
   1. Thème clair / sombre
   2. Langue FR / EN
   3. Rendu des projets (data/projects.json)
   4. Lightbox
   5. Initialisation
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
   2. LANGUE FR / EN
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
   3. RENDU DES PROJETS
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

  // Vignette (ouvre la lightbox)
  const boutonVignette = carte.querySelector(".carte-projet__vignette");
  const imageVignette = boutonVignette.querySelector("img");
  imageVignette.src = projet.thumbnail;
  imageVignette.alt = projet.title;
  boutonVignette.dataset.lightbox = projet.thumbnail;
  boutonVignette.setAttribute("aria-label", `${traduire("projets.agrandir")} : ${projet.title}`);

  // Textes
  carte.querySelector(".carte-projet__categorie").textContent = traduire(`categorie.${projet.category}`);
  carte.querySelector(".carte-projet__titre").textContent = projet.title;
  carte.querySelector(".carte-projet__description").textContent =
    projet[`description_${langueCourante}`] ?? projet.description_fr;

  // Tags
  remplirListe(carte.querySelector(".carte-projet__tags"), projet.tags, (tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    return item;
  });

  // Galerie (chaque image ouvre la lightbox)
  remplirListe(carte.querySelector(".carte-projet__galerie"), projet.gallery_images, (source, index) => {
    const item = document.createElement("li");
    const bouton = document.createElement("button");
    const image = document.createElement("img");

    bouton.type = "button";
    bouton.dataset.lightbox = source;
    bouton.setAttribute("aria-label", `${traduire("projets.agrandir")} : ${projet.title} (${index + 1})`);
    image.src = source;
    image.alt = "";
    image.loading = "lazy";

    bouton.append(image);
    item.append(bouton);
    return item;
  });

  // Liens (on ignore ceux dont l'URL est vide)
  const liensValides = Object.entries(projet.links ?? {}).filter(([, url]) => url);
  remplirListe(carte.querySelector(".carte-projet__liens"), liensValides, ([type, url]) => {
    const item = document.createElement("li");
    const lien = document.createElement("a");
    lien.href = url;
    lien.target = "_blank";
    lien.rel = "noopener";
    lien.textContent = traduire(`lien.${type}`);
    item.append(lien);
    return item;
  });

  return carte;
}

// Remplit une liste <ul> ; la retire complètement si elle est vide
function remplirListe(liste, elements = [], creerItem) {
  if (elements.length === 0) {
    liste.remove();
    return;
  }
  liste.replaceChildren(...elements.map(creerItem));
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
    if (!declencheur) return;

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
   5. INITIALISATION
   ========================================================= */
initialiserLangue();
initialiserTheme();
initialiserLightbox();
chargerProjets();

document.getElementById("annee-courante").textContent = new Date().getFullYear();