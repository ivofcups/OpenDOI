// ==UserScript==
// @name           OpenDOI
// @namespace      https://github.com/ivofcups/OpenDOI
// @match          *://*/*
// @grant          GM_xmlhttpRequest
// @version        1.01
// @author         ivofcups
// @license        MIT
// @description    Display a banner to download the article on Sci-Hub if available
// @description:de Zeigen Sie ein Banner an, um den Artikel über Sci-Hub herunterzuladen, falls verfügbar
// @description:es Despliegue un banner para descargar el artículo sobre Sci-Hub si está disponible
// @description:fr Affiche une bannière pour télécharger l'article sur Sci-Hub si disponible
// @description:it Mostra un banner per scaricare l'articolo su Sci-Hub, se disponibile
// @icon           https://sci-hub.tw/favicon.ico
// @connect        sci-hub.tw
// @inject-into    content
// @noframes
// @homepageURL    https://github.com/ivofcups/OpenDOI
// @supportURL     https://github.com/ivofcups/OpenDOI/issues
// @downloadURL    https://github.com/ivofcups/OpenDOI/raw/master/OpenDOI.user.js
// ==/UserScript==

/* jshint esversion: 6 */

const SCI_HUB_URL = "https://sci-hub.tw";

function getUserLanguage() {
  const language = navigator.language.slice(0, 2);
  return ['de', 'en', 'es', 'fr', 'it'].includes(language) ? language : 'en';
}

const downloadMessages = {
  de: 'Bitten Sie Alexandra Elbakyan um einen Gefallen',
  en: 'Ask Alexandra Elbakyan a favour',
  es: 'Pedirle un favor a Alexandra Elbakyan',
  fr: 'Demandez une faveur à Alexandra Elbakyan',
  it: 'Chiedi a Alexandra Elbakyan un favore',
};

const errorMessages = {
  de: 'Es gibt einen Fehler bei der Verbindung zu Sci-Hub. Sie sollten die Sci-Hub-Adresse und Ihr Netzwerk überprüfen.',
  en: 'There is an error connecting to Sci-Hub. You should check the Sci-Hub address and your network.',
  es: 'Hay un error de conexión con Sci-Hub. Deberías comprobar la dirección de Sci-Hub y tu red.',
  fr: 'Il y a une erreur de connexion à Sci-Hub. Vous devez vérifier l’adresse de Sci-Hub et votre réseau.',
  it: 'C\'è un errore di connessione a Sci-Hub. Dovresti controllare l\'indirizzo di Sci-Hub e la tua rete.',
};

//Querry for name of doi, i insensitive
function getDoiReference() {
  const detectedDoiMeta = document.querySelector('meta[name="doi" i], meta[name="dc.identifier" i], meta[name="citation_doi" i], meta[property="citation_doi" i]');
  detectedDoiMeta.content = detectedDoiMeta.content.match(/10[\S]*/gi)[0];
  if (detectedDoiMeta) return detectedDoiMeta.content;
  return null;
}

class NetworkError extends Error {
  constructor(status, ...params) {
    super(...params);
    if(Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
    this.name = 'NetworkError';
    if (status) {
      this.message = `Website responded with status ${status}.`;
    } else {
      this.message = "Unknown error.";
    }
  }
}

function gm_fetch(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onload: function({ status, responseText }) {
        if (status < 200 && status >= 300) return reject(new NetworkError(status));
        resolve(responseText);
      },
      onerror: function() { reject(new NetworkError()); },
    });
  });
}

async function getDownloadLink(doiReference) {
  try {
    const scihubPageHtml = await gm_fetch(`${SCI_HUB_URL}/${doiReference}`);
    const parser = new DOMParser();
    const scihubPageDocument = parser.parseFromString(scihubPageHtml, "text/html");
    const pdfDownloadLink = scihubPageDocument.querySelector(`a[onclick$="?download=true'"]`);
    const match = pdfDownloadLink.getAttribute("onclick").match(/^location\.href='(.*)'$/);
    const downloadLink = match[1];
    return downloadLink.slice(0,-14); 
  } catch (e) {
    if (e instanceof NetworkError) {
      // If this is a network error, Sci-Hub is probably not working and it should be noted to the user
      console.error(e);
      return null;
    }
    const fallbackLink = `${SCI_HUB_URL}/${doiLink}`;
    return fallbackLink;
  }
}

function buildBanner(isDownloadAvailable) {
  const bannerElement = document.createElement('div');
  bannerElement.style = `
    background-color: ${isDownloadAvailable ? 'orange' : 'red'};
    min-height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    z-index: 2147483647;
  `;
  
  return bannerElement;
}

function buildBannerContent(downloadLink) {
  const language = getUserLanguage();

  if (!downloadLink) {
    const errorMessage = document.createElement('span');
    errorMessage.textContent = errorMessages[language];
    errorMessage.style = `
      color: white;
      font-size: 16px;
    `;
    
    return errorMessage;
  }
  
  const downloadLinkElement = document.createElement('a');
  downloadLinkElement.textContent = downloadMessages[language];
  downloadLinkElement.href = downloadLink;
  downloadLinkElement.download = true;
  downloadLinkElement.style = `
    color: white;
    font-size: 16px;
  `;
  
  return downloadLinkElement;
}

async function displayBannerWhenDoiIsDetected() {
  const doiReference = getDoiReference();
  if (!doiReference) {
    console.log('No DOI found.');
    return;
  }
  
  console.log("DOI detected:", doiReference);
  
  const downloadLink = await getDownloadLink(doiReference);
  
  if (!downloadLink) {
    console.log("No download link found.");
  } else {
    console.log("Download link retrieved:", downloadLink);
  }

  const banner = buildBanner(downloadLink);
  const bannerContent = buildBannerContent(downloadLink);

  banner.append(bannerContent);
  document.body.prepend(banner);
}

displayBannerWhenDoiIsDetected();
