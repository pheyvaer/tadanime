/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const auth = require('solid-auth-client');
const User = require('./lib/user');
const Fetcher = require('./lib/fetcher');

const fetcher = new Fetcher();
const podURL = 'https://ph_test.solid.community';
const dataURL = podURL + '/public/data.ttl';
let user = null;
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

let openCardGroup = null;

auth.trackSession(async session => {
  const loggedIn = !!session;
  console.log(`logged in: ${loggedIn}`);

  if (loggedIn) {
    $('#login-btn').hide();
    $('#logout-btn').show();
    user = new User(await fetcher.getUserDataInStore(dataURL));
    addAnimeToPage(await fetcher.getDetailsOfAnime('https://betweenourworlds.org/anime/gochuumon-wa-usagi-desu-ka'), 2);
    const animeURLs = user.getAllAnimeURLs();

    animeURLs.forEach(async a => {
      if (animeUrls.indexOf(a) === -1) {
        const result = await fetcher.getDetailsOfAnime(a);
        const id = counter;
        counter++;

        anime[id] = result;
        animeUrls.push(result.url);
        addAnimeToPage(result, id);
      } else {
        console.info(`The anime with iri ${a} is already displayed => not added`);
        //TODO update rating if any
      }
    })
  } else {
    $('#logout-btn').hide();
    $('#login-btn').show();
    user = null;

    const anime = await fetcher.getRandomAnime(12);

    anime.forEach(result => {
      const id = counter;
      counter ++;

      anime[id] = result;
      animeUrls.push(result.url);
      addAnimeToPage(result, id);
    });
  }
});

$('#login-btn').click(() => {
  auth.popupLogin({ popupUri: 'popup.html' })
  $('#login-btn').hide();
  $('#logout-btn').show();
});

$('#logout-btn').click(() => {
  auth.logout();
  $('#logout-btn').hide();
  $('#login-btn').show();
});

// $("input[name='optradio']").click(saveRatingOfCurrentAnime);

async function addAnimeToPage(a, id) {
  const $card = $(`<div class="card"></div>`);
  let imgSrc = a.image;

  if (!imgSrc) {
    imgSrc = './img/placeholder.svg';
  }

  const $img = $(`<img class="card-img-top" src="${imgSrc}" alt="image of ${a.title}">`);
  $card.append($img);

  const $cardBody = $(`<div class="card-body"></div>`);
  const $title = $(`<h5 class="card-title">${a.title}</h5>`);
  $cardBody.append($title);
  const $text = $(`<p class="card-text">${truncateDescription(a.description)}</p>`);
  $cardBody.append($text);
  $card.append($cardBody);

  let ratingStr = 'no rating';

  if (user) {
    const rating = await user.getRatingForAnime(a.url);

    if (rating) {
      ratingStr = '';

      for (let i = 1; i <= rating; i++) {
        ratingStr += '<i class="fas fa-star"></i>';
      }

      for (let i = rating; i < 5; i++) {
        ratingStr += '<i class="far fa-star"></i>';
      }
    }
  }

  const $cardFooter = $(`<div class="card-footer"></div>`);
  const $footerText = $(`<small class="text-muted"><form class="rating">
  <label>
    <input type="radio" name="stars" value="1" />
    <i class="fas fa-star"></i>
  </label>
  <label>
    <input type="radio" name="stars" value="2" />
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
  </label>
  <label>
    <input type="radio" name="stars" value="3" />
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i> 
  </label>
  <label>
    <input type="radio" name="stars" value="4" />
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
  </label>
  <label>
    <input type="radio" name="stars" value="5" />
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
    <i class="fas fa-star"></i>
  </label>
</form></small>`);
  $cardFooter.append($footerText);
  $card.append($cardFooter);

  $(`#all-anime`).append($card);

  // if (!openCardGroup) {
  //   //TODO better id for group
  //   const $cardGroup = $(`<div id="group-${id}" class="row card-group"></div>`);
  //   $cardGroup.append($card);
  //   $(`#all-anime`).append($cardGroup);
  //   openCardGroup = {el: $cardGroup, length: 1};
  // } else {
  //   openCardGroup.el.append($card);
  //
  //   if (openCardGroup.length === 2) {
  //     openCardGroup = null;
  //   } else {
  //     openCardGroup.length ++;
  //   }
  // }
}

function truncateDescription(description, maxLength = 200) {
  if (!description) {
    return "";
  }

  if (description.length > maxLength) {
    return description.substring(0, 197) + '...';
  } else {
    return description;
  }
}