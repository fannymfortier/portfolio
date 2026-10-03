/* =========================================================
   PROJET.JS — Projets
   ---------------------------------------------------------
   1. Chargement et grille de l'accueil (filtre et recherche)
   2. Page projet
   Les gabarits (cartes, blocs, médias) sont dans templates.js
   ========================================================= */

import { CHEMIN_PROJETS, FILTRE_TOUS, traduire, texteDe, chargerJSON, normaliser } from "./utilitaire.js";
import {
  remplirFiche,
  marquerVideSiErreur,
  creerBlocs,
  creerCarteProjet,
  creerBoutonFiltre,
  creerMessageGrille,
  decouperTexte,
  remplirLiens,
  suivreChargement
} from "./templates.js";

const page = document.getElementById("page-projet");

// État des projets
let listeProjets = [];
let projetsCharges = false;
let filtreCourant = FILTRE_TOUS;
let rechercheCourante = "";


/* =========================================================
   1. CHARGEMENT ET GRILLE DE L'ACCUEIL
   ---------------------------------------------------------
   Cloner le template de projet pour chaque projet (templates.js)
   ========================================================= */
const grilleProjets = document.getElementById("grille-projets");
const filtreCategories = document.getElementById("filtre-categories");
const champRecherche = document.getElementById("recherche-projets");
const statutProjets = document.getElementById("statut-projets");
const idProjet = new URLSearchParams(window.location.search).get("id");

export async function chargerProjets() {
  try {
    listeProjets = await chargerJSON(CHEMIN_PROJETS);
    projetsCharges = true;
    afficherLesProjets();
  } catch (erreur) {
    console.error("Erreur de chargement des projets :", erreur);
    if (grilleProjets) afficherMessageGrille("projets.erreur");
    if (page) afficherPageProjet(null, idProjet);
  }
}

// Accueil : grille et filtres. Page projet : le projet demandé dans l'URL.
export function afficherLesProjets() {
  if (!projetsCharges) return;

  if (grilleProjets) {
    afficherFiltres();
    afficherProjets();
  }

  if (page) {
    afficherPageProjet(listeProjets, idProjet);
  }

  annoncerNouveauContenu();
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
  annoncerNouveauContenu();
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

export function initialiserFiltres() {
  if (!grilleProjets) return;

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

// interactif.js écoute cet événement pour les apparitions au scroll
function annoncerNouveauContenu() {
  document.dispatchEvent(new CustomEvent("contenu-ajoute"));
}


/* =========================================================
   2. PAGE PROJET
   ========================================================= */
function afficherPageProjet(projets, id) {

  const index = projets ? projets.findIndex((projet) => projet.id === id) : -1;

  if (index === -1) {
    afficherMessage(projets ? "projet.introuvable" : "projets.erreur");
    return;
  }

  const projet = projets[index];
  basculerContenu(true);
  document.title = `${projet.title} — Fanny Fortier`;

  remplirEntete(projet);
  remplirCouverture(projet);
  page.querySelector(".projet__blocs").replaceChildren(...creerBlocs(projet.content ?? []));
  remplirSuivant(projets[(index + 1) % projets.length], projets.length > 1);

  // Contenu en place : l'animation d'entrée peut commencer
  page.classList.add("projet--pret");
}

function afficherMessage(cle) {
  basculerContenu(false);
  const titre = page.querySelector(".projet__titre");
  titre.textContent = traduire(cle);
  delete titre.dataset.texte;
  page.classList.add("projet--pret");
}

function basculerContenu(visible) {
  page.querySelectorAll(".projet__categorie, .projet__description, .projet__fiche, .projet__liens, .projet__corps, .projet__suivant")
    .forEach((element) => {
      element.hidden = !visible;
    });
}

function remplirEntete(projet) {
  page.querySelector(".projet__categorie").textContent = traduire(`categorie.${projet.category}`);
  decouperTexte(page.querySelector(".projet__titre"), projet.title);
  page.querySelector(".projet__description").textContent = texteDe(projet, "description");

  remplirFiche(page.querySelector(".projet__fiche"), {
    year: projet.year,
    duration: texteDe(projet, "duration"),
    role: texteDe(projet, "role"),
    team: texteDe(projet, "team"),
    tools: (projet.tags ?? []).join(", ")
  });

  remplirLiens(page.querySelector(".projet__liens"), projet.links);
}

function remplirCouverture(projet) {
  const source = projet.cover || projet.thumbnail;
  const figure = page.querySelector(".projet__couverture");
  const bouton = figure.querySelector("button");
  const image = bouton.querySelector("img");

  figure.hidden = !source;
  if (!source) return;

  // Seulement au premier affichage, pas à chaque changement de langue
  if (image.dataset.source !== source) {
    image.dataset.source = source;
    marquerVideSiErreur(image, bouton);
    bouton.dataset.lightbox = source;
    image.src = source;
    suivreChargement(image, bouton);
  }

  image.alt = projet.title;
  bouton.setAttribute("aria-label", `${traduire("projets.agrandir")} : ${projet.title}`);
}

function remplirSuivant(projet, visible) {
  const section = page.querySelector(".projet__suivant");
  const lien = section.querySelector(".projet__suivant-lien");

  section.hidden = !visible;
  lien.href = `projet.html?id=${encodeURIComponent(projet.id)}`;
  lien.textContent = projet.title;
}
