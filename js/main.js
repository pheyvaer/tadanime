/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namedNode = N3.DataFactory.namedNode;

solid.auth.trackSession(session => {
  const loggedIn = !!session;
  console.log(`logged in: ${loggedIn}`);
});

const popupUri = 'popup.html';
$('#login-btn').click(() => {
  solid.auth.popupLogin({ popupUri })
});

$('#all-user-anime-btn').click(() => {
  fetchAllAnimeFromUser();
});

let counter = 0;
const anime = {};
const animeUrls = [];
const tbody = $('#anime-table-body');
let currentAnimeID;
const ratingsMap = {
  'rating-no': null,
  'rating-1': 1,
  'rating-2': 2,
  'rating-3': 3,
  'rating-4': 4,
  'rating-5': 5
};

let userDataStore;

addTestData();

const query = `SELECT * {
?s ?p <http://dbpedia.org/ontology/Anime>.
?s <http://dbpedia.org/ontology/title> ?title.
?s <http://schema.org/image> ?image.
} LIMIT 8`;

const myEngine = Comunica.newEngine();
myEngine.query(query,
  { sources: [ { type: 'hypermedia', value: 'https://data.betweenourworlds.org/latest' } ] })
  .then(function (result) {
    result.bindingsStream.on('data', function (data) {
     result = data.toObject();

      const id = counter;
      counter ++;
      const url = result['?s'];

      if (animeUrls.indexOf(url) === -1) {
        animeUrls.push(url);

        anime[id] = {
          title: result['?title'].value,
          url,
          image: result['?image'].value
        };

        addAnimeToTable(anime[id], id);
      }
    });
  });

async function showInfo(id) {
  currentAnimeID = id;
  const animeDetails = anime[id];

  const detailsDiv = document.getElementById('anime-details');
  const str = `<h3>${animeDetails.title}</h3>
  <img src="${animeDetails.image}" width="200px" />
  `;
  detailsDiv.innerHTML = str;

  const rating = await getRatingOfUserForAnime(animeDetails.url);

  let ratingID = '#rating-no';

  if (rating !== null) {
    ratingID = '#rating-' + rating;
  }

  $(ratingID).prop('checked', true);
}

function getRatingForAnime(url) {
  return 1;
}

function saveRatingOfCurrentAnime() {
  const animeURL = anime[currentAnimeID].url;

  //get the review
  //if no review create one

  //get the rating
  //if no rating create one

  //add or update rating value
}

function getCurrentRating() {
  return ratingsMap[$("input[name=optradio]:checked").attr('id')];
}

function getUserDataInStore() {
  const deferred = Q.defer();

  if (userDataStore) {
    deferred.resolve(userDataStore);
  } else {
    solid.auth.fetch('https://ph_test.solid.community/public/data.ttl')
      .then(res => res.text())
      .then(body => {
        userDataStore = N3.Store();
        const parser = N3.Parser();

        parser.parse(body, (err, quad, prefixes) => {
          if (err) {
            deferred.reject();
          } else if (quad) {
            userDataStore.addQuad(quad);
          } else {
            deferred.resolve(userDataStore);
          }
        });
      });
  }

  return deferred.promise;
}

function getRatingOfUserForAnime(animeURL) {
  const deferred = Q.defer();
  console.log(animeURL);

  getUserDataInStore().then(store => {
    const actions = store.getQuads(null, null, namedNode(animeURL)).map(a => a.subject);
    let ratingValue = null;

    if (actions.length > 0) {
      const reviews = store.getQuads(actions[0], 'http://schema.org/review', null).map(a => a.object);

      if (reviews.length > 0) {
        const ratings = store.getQuads(reviews[0], 'http://schema.org/starRating', null).map(a => a.object);

        if (ratings.length > 0) {
          const ratingValues = store.getQuads(ratings[0], 'http://schema.org/ratingValue', null).map(a => a.object.value);

          if (ratingValues.length > 0) {
            ratingValue = ratingValues[0];
          }
        }
      }
    }

    let result = parseInt(ratingValue)/2;

    if (isNaN(result)) {
      result = null;
    }

    deferred.resolve(result);

  });

  return deferred.promise;
}

async function addTestData() {
  const result = await fetchDataAnime('https://betweenourworlds.org/anime/gochuumon-wa-usagi-desu-ka');
  const id = counter;

  anime[id] = result;
  animeUrls.push(result.url);

  counter ++;

  addAnimeToTable(result, id);
}

async function fetchDataAnime(animeURL) {
  const fetcher = new window.ldfetch();
  const result = {url: animeURL};

  let response = await fetcher.get(animeURL);

  for (let i = 0; i < response.triples.length; i ++) {
    let triple = response.triples[i];

    if (triple.subject.value === animeURL) {
      if (triple.predicate.value === 'http://dbpedia.org/ontology/title') {
        if (triple.object.language === 'en' || !result.title) {
          result.title = triple.object.value;
        }
      } else if (triple.predicate.value === 'http://schema.org/image') {
        result.image = triple.object.value;
      }
    }
  }

  return result;
}

function fetchAllAnimeFromUser(){
  getUserDataInStore().then(store => {
    const animeURLs = store.getQuads(null, 'http://schema.org/object', null).map(a => a.object.value);

    animeURLs.forEach(async a => {
      const result = await fetchDataAnime(a);
      const id = counter;
      counter ++;

      anime[id] = result;
      animeUrls.push(result.url);
      addAnimeToTable(result, id);
    })
  });
}

function addAnimeToTable(a, id) {
  const $tr = $('<tr></tr>');
  const $td = $('<td></td>');
  const $btn = $(`<button id="anime-${id}" type="button">${a.title}</button>`);
  $btn.click(showInfo.bind(null, id));

  $tr.append($td);
  $td.append($btn);

  tbody.append($tr);
}