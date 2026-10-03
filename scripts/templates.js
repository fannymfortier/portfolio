/* =========================================================
   TEMPLATES.JS — Gabarits et éléments générés
   ---------------------------------------------------------
   1. Outils partagés
   2. Titre découpé en lettres
   3. Cartes et filtres de l'accueil
   4. Blocs de contenu de la page projet
   5. Médias (image, vidéo)
   ========================================================= */

import { traduire, texteDe, anneeDe, FILTRE_TOUS } from "./utilitaire.js";




// Les lignes vides sont cachées
export function remplirFiche(fiche, valeurs) {
  let nombreVisible = 0;

  fiche.querySelectorAll("[data-champ]").forEach((item) => {
    const valeur = valeurs[item.dataset.champ] ?? "";
    item.hidden = !valeur;
    item.querySelector("dd").textContent = valeur;
    if (valeur) nombreVisible++;
  });

  return nombreVisible;
}

// Image introuvable : on garde le cadre vide plutôt qu'une image brisée
// Liens externes en pilules (URL vide = ignoré)
export function remplirLiens(liste, liens = {}) {
  const valides = Object.entries(liens).filter(([, url]) => url);

  liste.hidden = valides.length === 0;
  liste.replaceChildren(...valides.map(([type, url]) => {
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

// Gribouillis pendant le chargement, puis l'image se développe.
// À appeler après avoir mis le src. Image déjà en cache = rien à faire.
export function suivreChargement(image, cadre) {
  if (image.complete && image.naturalWidth > 0) return;

  cadre.classList.remove("media--developpee");
  cadre.classList.add("media--en-chargement");

  image.addEventListener("load", () => {
    cadre.classList.remove("media--en-chargement");
    cadre.classList.add("media--developpee");
  }, { once: true });

  image.addEventListener("error", () => {
    cadre.classList.remove("media--en-chargement");
  }, { once: true });
}

export function marquerVideSiErreur(image, cadre) {
  cadre.classList.remove("media--vide");
  image.onerror = () => {
    cadre.classList.add("media--vide");
    cadre.removeAttribute("data-lightbox");
  };
}

function cloner(idGabarit) {
  const clone = document.getElementById(idGabarit).content.firstElementChild.cloneNode(true);

  clone.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = traduire(element.dataset.i18n);
  });

  return clone;
}


/* =========================================================
   2. TITRE DÉCOUPÉ EN LETTRES
   ---------------------------------------------------------
   data-i18n-lettres="cle" : traduit le texte et met chaque
   lettre dans un span, pour les animations
   ========================================================= */
export function decouperEnLettres(element) {
  element.dataset.texteOriginal ??= element.textContent.trim();

  const cle = element.dataset.i18nLettres;
  const traduction = traduire(cle);
  decouperTexte(element, traduction === cle ? element.dataset.texteOriginal : traduction);
}

// Même chose pour un texte qui ne vient pas des traductions (ex. titre d'un projet)
export function decouperTexte(element, texte) {
  // Même texte = on ne rejoue pas l'animation
  if (element.dataset.texte === texte) return;
  element.dataset.texte = texte;

  // Texte complet pour les lecteurs d'écran, les lettres sont cachées
  const texteLisible = document.createElement("span");
  texteLisible.className = "visuellement-cache";
  texteLisible.textContent = texte;

  // Titre en plusieurs morceaux : les lettres continuent après le morceau précédent
  let index = 0;
  let precedent = element.previousElementSibling;
  while (precedent) {
    index += precedent.querySelectorAll(".decoupe__lettre").length;
    precedent = precedent.previousElementSibling;
  }
  const morceaux = texte.split(" ").flatMap((mot, position) => {
    const spanMot = document.createElement("span");
    spanMot.className = "decoupe__mot";
    spanMot.setAttribute("aria-hidden", "true");

    for (const lettre of mot) {
      const spanLettre = document.createElement("span");
      spanLettre.className = "decoupe__lettre";
      spanLettre.style.setProperty("--i", index++);
      spanLettre.textContent = lettre;
      spanMot.append(spanLettre);
    }

    return position === 0 ? [spanMot] : [" ", spanMot];
  });

  element.replaceChildren(texteLisible, ...morceaux);
}


/* =========================================================
   3. CARTES ET FILTRES DE L'ACCUEIL
   ========================================================= */
export function creerCarteProjet(projet) {
  const carte = cloner("gabarit-carte-projet");
  carte.id = `projet-${projet.id}`;

  const image = carte.querySelector(".carte-projet__vignette img");
  cacherSiErreur(image, image);
  image.src = projet.thumbnail;
  image.style.objectPosition = projet.thumbnail_position ?? "";
  suivreChargement(image, carte.querySelector(".carte-projet__vignette"));

  const lien = carte.querySelector(".carte-projet__lien");
  lien.textContent = projet.title;
  lien.href = `projet.html?id=${encodeURIComponent(projet.id)}`;

  carte.querySelector(".carte-projet__categorie").textContent = traduire(`categorie.${projet.category}`);
  carte.querySelector(".carte-projet__annee").textContent = anneeDe(projet.date);
  carte.querySelector(".carte-projet__description").textContent = texteDe(projet, "description");
  remplirListe(carte.querySelector(".carte-projet__tags"), projet.tags, creerTag);

  return carte;
}

export function creerBoutonFiltre(categorie, actif) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "filtre-projets__bouton";
  bouton.dataset.categorie = categorie;
  bouton.textContent = traduire(categorie === FILTRE_TOUS ? "filtre.tous" : `categorie.${categorie}`);
  bouton.setAttribute("aria-pressed", String(actif));
  return bouton;
}

export function creerMessageGrille(cle) {
  const message = document.createElement("p");
  message.className = "grille-projets__message";
  message.dataset.i18n = cle;
  message.textContent = traduire(cle);
  return message;
}

function creerTag(tag) {
  const item = document.createElement("li");
  item.textContent = tag;
  return item;
}

function cacherSiErreur(image, elementACacher) {
  elementACacher.hidden = false;
  image.onerror = () => {
    elementACacher.hidden = true;
  };
}

function remplirListe(liste, elements = [], creerItem) {
  liste.hidden = elements.length === 0;
  liste.replaceChildren(...elements.map(creerItem));
}


/* =========================================================
   4. BLOCS DE CONTENU DE LA PAGE PROJET
   ========================================================= */
export function creerBlocs(blocs) {
  return blocs.map(creerBloc).filter(Boolean);
}

function creerBloc(bloc) {
  if (bloc.type === "text") return creerBlocTexte(bloc);
  if (bloc.type === "media") return creerBlocMedia(bloc);
  if (bloc.type === "duo") return creerBlocDuo(bloc);
  if (bloc.type === "gallery") return creerBlocGalerie(bloc);
  if (bloc.type === "document") return creerBlocDocument(bloc);
  if (bloc.type === "sequence") return creerBlocSequence(bloc);
  if (bloc.type === "subproject") return creerBlocSousProjet(bloc);

  console.warn("Type de bloc inconnu :", bloc.type);
  return null;
}


// Une ligne vide dans le JSON = nouveau paragraphe
function remplirTexte(element, bloc) {
  const titre = element.querySelector(".bloc-texte__titre");
  titre.textContent = texteDe(bloc, "title");
  titre.hidden = !titre.textContent;

  const paragraphes = texteDe(bloc, "text")
    .split(/\n\s*\n/)
    .map((texte) => texte.trim())
    .filter(Boolean)
    .map((texte) => {
      const paragraphe = document.createElement("p");
      paragraphe.textContent = texte;
      return paragraphe;
    });

  element.querySelector(".bloc-texte__paragraphes").replaceChildren(...paragraphes);
}

function creerBlocTexte(bloc) {
  const element = cloner("gabarit-bloc-texte");
  remplirTexte(element, bloc);
  return element;
}

function creerBlocMedia(bloc) {
  return creerCadreMedia(bloc, [creerMedia(bloc)]);
}

// Plusieurs images dans un seul cadre, avec une seule légende
function creerBlocGalerie(bloc) {
  const figure = creerCadreMedia(bloc, (bloc.images ?? []).map(creerMedia));
  figure.querySelector(".bloc-media__cadre").classList.add("bloc-media__cadre--galerie");
  return figure;
}

// Pages d'un document qui défilent à l'horizontale, avec le PDF à télécharger
function creerBlocDocument(bloc) {
  const figure = creerCadreMedia(bloc, (bloc.pages ?? []).map((src, index) => creerMedia({
    src,
    alt_fr: `${texteDe(bloc, "title") || "Document"} — page ${index + 1}`,
    alt_en: `${texteDe(bloc, "title") || "Document"} — page ${index + 1}`
  })));
  figure.querySelector(".bloc-media__cadre").classList.add("bloc-media__cadre--document");

  if (bloc.pdf) {
    const lien = document.createElement("a");
    lien.className = "bloc-media__lien";
    lien.href = bloc.pdf;
    lien.target = "_blank";
    lien.rel = "noopener";
    lien.textContent = `${traduire("projet.telechargerPdf")} ↗`;

    const fiche = figure.querySelector(".bloc-media__fiche");
    fiche.append(lien);
    fiche.hidden = false;
  }

  return figure;
}

// Images et vidéos collées l'une sous l'autre, comme un seul long fichier
function creerBlocSequence(bloc) {
  const figure = creerCadreMedia(bloc, (bloc.items ?? []).map(creerMedia));
  figure.querySelector(".bloc-media__cadre").classList.add("bloc-media__cadre--sequence");
  return figure;
}

// Cadre média : le ou les médias, puis légende, outils et crédits
function creerCadreMedia(bloc, medias) {
  const figure = cloner("gabarit-bloc-media");
  if (bloc.width === "full") figure.classList.add("bloc-media--pleine");

  figure.querySelector(".bloc-media__cadre").append(...medias);

  const legende = figure.querySelector(".bloc-media__legende");
  legende.textContent = texteDe(bloc, "caption");
  legende.hidden = !legende.textContent;

  const infos = figure.querySelector(".bloc-media__infos");
  const nombreInfos = remplirFiche(infos, {
    tools: (bloc.tools ?? []).join(", "),
    credits: (bloc.credits ?? []).join(", ")
  });
  infos.hidden = nombreInfos === 0;

  figure.querySelector(".bloc-media__fiche").hidden = legende.hidden && infos.hidden;
  return figure;
}

// Sous-projet : sa propre fiche, ses liens et ses blocs
function creerBlocSousProjet(bloc) {
  const element = cloner("gabarit-bloc-sousprojet");

  element.querySelector(".bloc-sousprojet__titre").textContent = texteDe(bloc, "title");

  const description = element.querySelector(".bloc-sousprojet__description");
  description.textContent = texteDe(bloc, "description");
  description.hidden = !description.textContent;

  const fiche = element.querySelector(".bloc-sousprojet__fiche");
  fiche.hidden = remplirFiche(fiche, {
    role: texteDe(bloc, "role"),
    team: texteDe(bloc, "team"),
    tools: (bloc.tools ?? []).join(", ")
  }) === 0;

  remplirLiens(element.querySelector(".bloc-sousprojet__liens"), bloc.links);
  element.querySelector(".bloc-sousprojet__blocs").replaceChildren(...creerBlocs(bloc.content ?? []));
  return element;
}

function creerBlocDuo(bloc) {
  const element = cloner("gabarit-bloc-duo");
  if (bloc.reverse) element.classList.add("bloc-duo--inverse");

  element.querySelector(".bloc-duo__media").append(creerBlocMedia(bloc.media ?? {}));
  remplirTexte(element, bloc);
  return element;
}


/* =========================================================
   5. MÉDIAS (IMAGE, VIDÉO)
   ---------------------------------------------------------
   "src" : image
   "video" : "youtube:ID", "vimeo:ID" ou chemin d'un .mp4
   ========================================================= */
function creerMedia(bloc) {
  const texteAlternatif = texteDe(bloc, "alt");
  if (bloc.video) return creerVideo(bloc, texteAlternatif);

  const bouton = document.createElement("button");
  const image = document.createElement("img");

  bouton.type = "button";
  bouton.className = "bloc-media__image";
  bouton.dataset.lightbox = bloc.src ?? "";
  bouton.setAttribute("aria-label", texteAlternatif
    ? `${traduire("projets.agrandir")} : ${texteAlternatif}`
    : traduire("projets.agrandir"));

  marquerVideSiErreur(image, bouton);
  image.src = bloc.src ?? "";
  image.alt = texteAlternatif;
  image.loading = "lazy";
  if (bloc.ratio) image.style.aspectRatio = bloc.ratio;
  suivreChargement(image, bouton);

  bouton.append(image);
  return bouton;
}

function creerVideo(bloc, texteAlternatif) {
  const [service, id] = bloc.video.split(":");

  const adresses = {
    youtube: `https://www.youtube-nocookie.com/embed/${id}`,
    vimeo: `https://player.vimeo.com/video/${id}?dnt=1`,
    behance: `https://www.behance.net/embed/project/${id}?ilo0=1`
  };

  if (adresses[service]) {
    const iframe = document.createElement("iframe");
    iframe.className = `bloc-media__video bloc-media__video--externe bloc-media__video--${service}`;
    iframe.src = adresses[service];
    iframe.title = texteAlternatif || traduire("projet.video");
    iframe.loading = "lazy";
    iframe.allow = "autoplay; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    return iframe;
  }

  const video = document.createElement("video");
  video.className = "bloc-media__video";
  video.src = bloc.video;
  video.playsInline = true;
  video.preload = "metadata";
  if (bloc.poster) video.poster = bloc.poster;
  if (bloc.ratio) video.style.aspectRatio = bloc.ratio;
  if (texteAlternatif) video.setAttribute("aria-label", texteAlternatif);

  // Boucle muette, sauf si l'utilisateur préfère moins d'animations
  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (bloc.loop && !mouvementReduit) {
    video.muted = true;
    video.setAttribute("muted", "");
    video.loop = true;
    video.autoplay = true;
  } else {
    video.controls = true;
    video.loop = Boolean(bloc.loop);
  }

  return video;
}
