/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

solid.auth.trackSession(session => {
  const loggedIn = !!session;
  console.log(`logged in: ${loggedIn}`);
});

const popupUri = 'popup.html';
$('#login-btn').click(() => {
  solid.auth.popupLogin({ popupUri })
});

let counter = 0;
const anime = {};
const animeUrls = [];
const tbody = $('#anime-table-body');
let currentAnimeID;
const fragmentsClient = new window.ldf.FragmentsClient('https://data.betweenourworlds.org/latest');
const ratingsMap = {
  'rating-no': null,
  'rating-1': 1,
  'rating-2': 2,
  'rating-3': 3,
  'rating-4': 4,
  'rating-5': 5
};
//
// const query = `SELECT * {
// ?s ?p <http://dbpedia.org/ontology/Anime>.
// ?s <http://dbpedia.org/ontology/title> ?title.
// ?s <http://schema.org/image> ?image.
// } LIMIT 5`;
//
// const results = new window.ldf.SparqlIterator(query, { fragmentsClient });
//
// results.on('data', result => {
//   const id = counter;
//   counter ++;
//   const url = result['?s'];
//
//   if (animeUrls.indexOf(url) === -1) {
//     animeUrls.push(url);
//
//     anime[id] = {
//       title: result['?title'],
//       url,
//       image: N3.Util.getLiteralValue(result['?image'])
//     };
//
//     const $tr = $('<tr></tr>');
//     const $td = $('<td></td>');
//     const $btn = $(`<button id="anime-${id}" type="button">${result['?title']}</button>`);
//     $btn.click(showInfo.bind(null, id));
//
//     $tr.append($td);
//     $td.append($btn);
//
//     tbody.append($tr);
//   }
//
//  // addCallToLink('anime-' + id);
// });

function showInfo(id) {
  currentAnimeID = id;
  const animeDetails = anime[id];

  const detailsDiv = document.getElementById('anime-details');
  const str = `<h3>${animeDetails.title}</h3>
  <img src="${animeDetails.image}" width="200px" />
  `;
  detailsDiv.innerHTML = str;

  const rating = getRatingForAnime(animeDetails.url);

  switch(rating) {
    case 1:
      $('#rating-1').prop('checked', true);
      break;
    default:
      $('#rating-no').prop('checked', true);
  }
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
  solid.auth.fetch('https://ph_test.solid.community/public/data.ttl')
    .then(res => res.text())
    .then(body => {
      const store = N3.Store();
      const parser = N3.Parser();

      parser.parse(body, (err, quad, prefixes) => {
        if (quad) {
          store.addQuad(quad);
        } else {

        }
      });
    });
}

function getRatingOfUserForAnime(animeURL) {

}