/* =========================================================
   PROJET.JS — Page projet
   ---------------------------------------------------------
   1. Affichage de la page
   2. Blocs de contenu
   3. Médias (image, vidéo)
   ========================================================= */

const page = document.getElementById("page-projet");

let traduire = (cle) => cle;
let langue = "fr";


/* =========================================================
   1. AFFICHAGE DE LA PAGE
   ========================================================= */
export function afficherPageProjet(projets, id, contexte) {
  ({ traduire, langue } = contexte);

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
  remplirBlocs(projet.content ?? []);
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

// Champ traduit, avec le français par défaut
function texteDe(objet, champ) {
  return objet[`${champ}_${langue}`] || objet[`${champ}_fr`] || "";
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

// Les lignes vides sont cachées
function remplirFiche(fiche, valeurs) {
  let nombreVisible = 0;

  fiche.querySelectorAll("[data-champ]").forEach((item) => {
    const valeur = valeurs[item.dataset.champ] ?? "";
    item.hidden = !valeur;
    item.querySelector("dd").textContent = valeur;
    if (valeur) nombreVisible++;
  });

  return nombreVisible;
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


/* =========================================================
   2. BLOCS DE CONTENU
   ========================================================= */
function remplirBlocs(blocs) {
  const elements = blocs.map(creerBloc).filter(Boolean);
  page.querySelector(".projet__blocs").replaceChildren(...elements);
}

function creerBloc(bloc) {
  if (bloc.type === "text") return creerBlocTexte(bloc);
  if (bloc.type === "media") return creerBlocMedia(bloc);
  if (bloc.type === "duo") return creerBlocDuo(bloc);

  console.warn("Type de bloc inconnu :", bloc.type);
  return null;
}

function cloner(idGabarit) {
  const clone = document.getElementById(idGabarit).content.firstElementChild.cloneNode(true);

  clone.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = traduire(element.dataset.i18n);
  });

  return clone;
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
  const figure = cloner("gabarit-bloc-media");
  if (bloc.width === "full") figure.classList.add("bloc-media--pleine");

  figure.querySelector(".bloc-media__cadre").append(creerMedia(bloc));

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

function creerBlocDuo(bloc) {
  const element = cloner("gabarit-bloc-duo");
  if (bloc.reverse) element.classList.add("bloc-duo--inverse");

  element.querySelector(".bloc-duo__media").append(creerBlocMedia(bloc.media ?? {}));
  remplirTexte(element, bloc);
  return element;
}


/* =========================================================
   3. MÉDIAS (IMAGE, VIDÉO)
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

  bouton.append(image);
  return bouton;
}

function creerVideo(bloc, texteAlternatif) {
  const [service, id] = bloc.video.split(":");

  if (service === "youtube" || service === "vimeo") {
    const iframe = document.createElement("iframe");
    iframe.className = "bloc-media__video bloc-media__video--externe";
    iframe.src = service === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : `https://player.vimeo.com/video/${id}?dnt=1`;
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

// Image introuvable : on garde le cadre vide plutôt qu'une image brisée
function marquerVideSiErreur(image, cadre) {
  cadre.classList.remove("media--vide");
  image.onerror = () => {
    cadre.classList.add("media--vide");
    cadre.removeAttribute("data-lightbox");
  };
}
