/* =========================================================
   PROJET.JS — Page projet
   ---------------------------------------------------------
   1. Affichage de la page
   Les blocs et médias sont dans templates.js
   ========================================================= */

import { traduire, texteDe } from "./utilitaire.js";
import { remplirFiche, marquerVideSiErreur, creerBlocs } from "./templates.js";

const page = document.getElementById("page-projet");


/* =========================================================
   1. AFFICHAGE DE LA PAGE
   ========================================================= */
export function afficherPageProjet(projets, id) {

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
}

function afficherMessage(cle) {
  basculerContenu(false);
  page.querySelector(".projet__titre").textContent = traduire(cle);
}

function basculerContenu(visible) {
  page.querySelectorAll(".projet__categorie, .projet__description, .projet__fiche, .projet__liens, .projet__corps, .projet__suivant")
    .forEach((element) => {
      element.hidden = !visible;
    });
}

function remplirEntete(projet) {
  page.querySelector(".projet__categorie").textContent = traduire(`categorie.${projet.category}`);
  page.querySelector(".projet__titre").textContent = projet.title;
  page.querySelector(".projet__description").textContent = texteDe(projet, "description");

  remplirFiche(page.querySelector(".projet__fiche"), {
    year: projet.year,
    duration: texteDe(projet, "duration"),
    role: texteDe(projet, "role"),
    team: texteDe(projet, "team"),
    tools: (projet.tags ?? []).join(", ")
  });

  const liste = page.querySelector(".projet__liens");
  const liens = Object.entries(projet.links ?? {}).filter(([, url]) => url);

  liste.hidden = liens.length === 0;
  liste.replaceChildren(...liens.map(([type, url]) => {
    const item = document.createElement("li");
    const lien = document.createElement("a");
    lien.href = url;
    lien.target = "_blank";
    lien.rel = "noopener";
    lien.textContent = `${traduire(`lien.${type}`)} ↗`;
    item.append(lien);
    return item;
  }));
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
