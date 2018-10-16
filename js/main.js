/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namedNode = N3.DataFactory.namedNode;
const podURL = 'https://ph_test.solid.community';
const dataURL = podURL + '/public/data.ttl';

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

$("input[name='optradio']").click(saveRatingOfCurrentAnime);

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

  if (animeDetails.rating === undefined) {
    animeDetails.rating = await getRatingOfUserForAnime(animeDetails.url);
  }

  let ratingID = '#rating-no';

  if (animeDetails.rating !== null) {
    ratingID = '#rating-' + animeDetails.rating;
  }

  $(ratingID).prop('checked', true);
}

async function saveRatingOfCurrentAnime() {
  const rating = ratingsMap[this.id]*2;
  const animeURL = anime[currentAnimeID].url;
  const ratingURL = (await getRatingURLForAnime(animeURL)).value;

  if (ratingURL) {
    //we update the rating

    const updateQuery = `
    DELETE DATA
    { 
      <${ratingURL}> <http://schema.org/ratingValue> ?p.
    } WHERE {<${ratingURL}> <http://schema.org/ratingValue> ?p.}
    
    INSERT DATA
    { 
      <${ratingURL}> <http://schema.org/ratingValue> "${rating}".
    }
    `;

    console.log(updateQuery);

    solid.auth.fetch(dataURL, {
      method: 'PATCH',
      body: updateQuery,
      headers: {
        'Content-Type': 'application/sparql-update'
      }
    })
      .then(res => res.text())
      .then(body => {
        console.log(body);
      });

  } else {
    //need new action, review and rating objects
  }

  console.log(`${animeURL} => ${rating}`);

  //get the review
  //if no review create one

  //get the rating
  //if no rating create one

  //add or update rating value
}

function getUserDataInStore() {
  const deferred = Q.defer();

  if (userDataStore) {
    deferred.resolve(userDataStore);
  } else {
    solid.auth.fetch(dataURL)
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

  getUserDataInStore().then(store => {
    const source = {
      match: function(s, p, o, g) {
        return streamifyArray(store.getQuads(s, p, o, g));
      }
    };

    const myEngine = Comunica.newEngine();
    const query = `SELECT ?ratingValue {
      ?action ?p <${animeURL}>;
        <http://schema.org/review> ?review.
      ?review <http://schema.org/starRating> ?rating.
      ?rating <http://schema.org/ratingValue> ?ratingValue.
    }`;

    myEngine.query(query,
      { sources: [ { type: 'rdfjsSource', value: source } ] })
      .then(function (result) {
        result.bindingsStream.on('data', function (data) {
          // Each data object contains a mapping from variables to RDFJS terms.
          console.log(data.get('?ratingValue'));
          let result = parseInt(data.get('?ratingValue').value)/2;

          if (isNaN(result)) {
            result = null;
          }

          deferred.resolve(result);
        });
      });

  });

  return deferred.promise;
}

function getRatingURLForAnime(animeURL) {
  const deferred = Q.defer();

  getUserDataInStore().then(store => {
    const source = {
      match: function(s, p, o, g) {
        return streamifyArray(store.getQuads(s, p, o, g));
      }
    };

    const myEngine = Comunica.newEngine();
    const query = `SELECT ?rating {
      ?action ?p <${animeURL}>;
        <http://schema.org/review> ?review.
      ?review <http://schema.org/starRating> ?rating.
    }`;

    myEngine.query(query,
      { sources: [ { type: 'rdfjsSource', value: source } ] })
      .then(function (result) {
        result.bindingsStream.on('data', function (data) {
          deferred.resolve(data.get('?rating'));
        });
      });

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