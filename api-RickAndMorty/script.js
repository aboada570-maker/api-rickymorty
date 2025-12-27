//Variables globales
let selectedCharacter = null;
let currentPage = 1;
let isLoading = false;
let hasMorePages = true;

const characterCache = {};

//Elementos del DOM
const cardsContainer = document.getElementById('cards-container');
const nameFilter = document.getElementById('name-filters');
const statusFilter = document.getElementById('status-filter');
const speciesFilter = document.getElementById('species-filter');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

//Configuración de Gemini
const API_URL = 'https://gemini-simple-service-154326871283.us-central1.run.app/generate';

//Función que llama a la API y obtiene los personajes
async function getCharacters(name, status, species, page = 1) {
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (status) params.append('status', status);
  if (species) params.append('species', species);
  params.append('page', page);

  const url = `https://rickandmortyapi.com/api/character?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    hasMorePages = false;
    return [];
  }

  const data = await response.json();
  hasMorePages = Boolean(data.info.next);

  return data.results;
}

//Función de carga de personajes con paginación infinita
async function loadCharacters(reset = false) {
  if (isLoading || !hasMorePages) return;

  isLoading = true;
  loadingElement.classList.remove('hidden');

  if (reset) {
    currentPage = 1;
    hasMorePages = true;
    cardsContainer.innerHTML = '';
  }

  try {
    const characters = await getCharacters(
      nameFilter.value,
      statusFilter.value,
      speciesFilter.value,
      currentPage
    );

    renderCharacters(characters);
    currentPage++;

  } catch (error) {
    errorElement.classList.remove('hidden');
  } finally {
    isLoading = false;
    loadingElement.classList.add('hidden');
  }
}

//Función para renderizar los personajes
async function renderCharacters(characters) {

  for (let character of characters) {
    characterCache[character.id] = character;

    const card = document.createElement('div');
    card.classList.add('character-card');

    //Guardar el id del personaje en un atributo data
    card.dataset.id = character.id;
    
    card.innerHTML = `
      <img src="${character.image}">
      <h2>${character.name}</h2>
      <p>Estado: ${character.status}</p>
      <p>Especie: ${character.species}</p>
      <p>Género: ${character.gender}</p>
    `;

    cardsContainer.appendChild(card);
  }
};

cardsContainer.addEventListener('click', (event) => {
  const card = event.target.closest('.character-card');
  if (!card) return;

  const id = card.dataset.id;
  showDetail(id);
});

//Intersección para carga infinita
const sentinel = document.getElementById('sentinel');

const observer = new IntersectionObserver(
  entries => {
    if (entries[0].isIntersecting) {
      loadCharacters();
    }
  },
  {
    root: null,      // viewport
    rootMargin: '200px',
    threshold: 0
  }
);

observer.observe(sentinel);

//Eventos para carga infinita
nameFilter.addEventListener('input', () => loadCharacters(true));
statusFilter.addEventListener('change', () => loadCharacters(true));
speciesFilter.addEventListener('change', () => loadCharacters(true));

//Cargar los personajes inicialmente
loadCharacters(true);

//Función para simular retardo
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Función para mostrar detalle del personaje
window.showDetail = async function (id) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    try {
        let character;

        if (characterCache[id]) {
            character = characterCache[id];

        } else {
            character = await getCharacterById(id);
            characterCache[id] = character;
        }
        
        document.getElementById('detail-image').src = character.image;
        document.getElementById('detail-name').textContent = `Nombre: ${character.name}`;
        document.getElementById('detail-status').textContent = `Estado: ${character.status}`;
        document.getElementById('detail-species').textContent = `Especie: ${character.species}`;
        document.getElementById('detail-gender').textContent = `Género: ${character.gender}`;

        //Presentar JSON Crudo
        const jsonElement = document.getElementById('json-raw');
        jsonElement.textContent = JSON.stringify(character, null, 2);

        //Reset highlight y aplicar de nuevo
        delete jsonElement.dataset.highlighted;
        hljs.highlightElement(jsonElement);

    } catch (error) {
        alert('No se pudo cargar el detalle del personaje');
        modal.classList.add('hidden');
    }
};

//Función para obtener personaje por ID
async function getCharacterById(id) {
  const response = await fetch(`https://rickandmortyapi.com/api/character/${id}`);

  if (!response.ok) throw new Error('No se pudo obtener el personaje');
  return await response.json();
}

//Funciones para abrir y cerrar el modal
function openModal() {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(event) {
  const modal = document.getElementById('modal');

  if (
    event.target === modal ||
    event.target.classList.contains('close')
  ) {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }
}

//Código para el botón de IA
const aiBtn = document.getElementById('ai-btn');
const aiResult = document.getElementById('ai-result');
const aiLoading = document.getElementById('ai-loading');

aiBtn.addEventListener('click', async () => {
  aiResult.textContent = '';
  aiLoading.classList.remove('hidden');
   
  //Obtener el JSON del personaje
  const characterJSON = document.getElementById('json-raw').textContent;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: `Eres un fanático experto de la serie Rick & Morty y disfrutas explicar la serie a personas que no la conocen.
            A continuación vas a recibir información de un personaje específico de la serie en formato JSON, con esto genera un resumen de máximo 200 palabras
            creativo, atractivo y fácil de entender, resaltando su personalidad, rol en la serie y rasgos más importantes, .\n${characterJSON}`
      })
    });

    if (!response.ok) {
      throw new Error('Error en la respuesta de la IA');
    }

    const data = await response.json();
    console.log('Respuesta IA:', data);

    aiResult.textContent =
      data.generated_text ||
      data.result ||
      data.response ||
      data.text ||
      'La IA no devolvió texto';

  } catch (error) {
    console.error(error);
    aiResult.textContent = 'Error al generar el resumen con IA';
  } finally {
    aiLoading.classList.add('hidden');
  }
});

const scrollTopBtn = document.getElementById('scrollTopBtn');

//Botón para subir al inicio
document.addEventListener('DOMContentLoaded', () => {
  const scrollTopBtn = document.getElementById('scrollTopBtn');

  if (!scrollTopBtn) {
    console.error('No se encontró el botón scrollTopBtn');
    return;
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollTopBtn.style.display = 'block';
    } else {
      scrollTopBtn.style.display = 'none';
    }
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});