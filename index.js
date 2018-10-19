/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const auth = require('solid-auth-client');
const User = require('./lib/user');
const Fetcher = require('./lib/fetcher');
const saveRatingOfAnime = require('./lib/updater').saveRatingOfAnime;

const fetcher = new Fetcher();
const podURL = 'https://ph_test.solid.community';
const dataURL = podURL + '/public/data.ttl';
let user = null;
let counter = 0;
const anime = {};
const animeUrls = [];
let randomAnimeLoaded = false;

auth.trackSession(async session => {
  const loggedIn = !!session;
  console.log(`logged in: ${loggedIn}`);

  if (loggedIn) {
    $('#pod-alert').removeClass('hide hidden').addClass('show');

    setTimeout(() => {
      $('#pod-alert').removeClass('show').addClass('hide hidden');
    }, 10000);

    $('#login-btn').hide();
    $('#user-menu').show();
    user = new User(await fetcher.getUserDataInStore(dataURL));
    // addAnimeToPage(await fetcher.getDetailsOfAnime('https://betweenourworlds.org/anime/gochuumon-wa-usagi-desu-ka'), 2);
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
    });
  } else {
    $('#tpf-alert').removeClass('hide hidden').addClass('show');

    setTimeout(() => {
      $('#tpf-alert').removeClass('show').addClass('hide hidden');
    }, 10000);

    $('#user-menu').hide();
    $('#login-btn').show();

    if (!randomAnimeLoaded && !user) {
      fetcher.getRandomAnime(12, result => {
        const id = counter;
        counter++;

        anime[id] = result;
        animeUrls.push(result.url);
        addAnimeToPage(result, id);
      });

      randomAnimeLoaded = true;
    }

    user = null;
  }
});

$('.login-btn').click(() => {
  auth.popupLogin({ popupUri: 'popup.html' });
  // $('#login-btn').hide();
  // $('#logout-btn').show();
  $('#notloggedin-modal').modal('hide');
});

$('#logout-btn').click(() => {
  auth.logout();
  // $('#logout-btn').hide();
  // $('#login-btn').show();
});

$('#srch-btn').click(() => {
  const value = $('#srch-term').val();

  if (value !== undefined) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      if (animeUrls.indexOf(value) === -1) {
        //fetch data
        //todo
        console.log(value);
      } else {
        //show as only one in the list
        //todo
      }
    } else {
      //todo do elastic search
    }
  }
});

$('#srch-term').keypress(function (e) {
  const key = e.which;

  if(key === 13){
    $('#srch-btn').click();
    return false;
  }
});

async function addAnimeToPage(a, id) {
  const $card = $(`<div class="card"></div>`);
  let imgSrc = a.image;

  if (imgSrc) {
    const $img = $(`<img class="card-img-top" src="${imgSrc}" alt="image of ${a.title}">`);
    $card.append($img);
  }

  const $cardBody = $(`<div class="card-body"></div>`);
  const $title = $(`<h5 class="card-title">${a.title}</h5>`);
  $cardBody.append($title);
  const $text = $(`<p class="card-text">${truncateDescription(a.description)}</p>`);
  $cardBody.append($text);
  $card.append($cardBody);

  let rating = null;

  if (user) {
    rating = await user.getRatingForAnime(a.url);
  }

  const $cardFooter = $(`<div class="card-footer"></div>`);
  const $footerText = $(`<div></div>`);
  const $form = $(`<form class="rating"></form>`);

  for (let i = 1; i <= 5; i ++) {
    const $label = $('<label></label>');
    let input = `<input type="radio" name="stars" value="${i}"`;

    if (i === rating) {
      input += ` checked`;
    }

    input += ' />';
    const $input = $(input);

    $input.change(async (e) => {
      if (user) {
        const rating = $(e.currentTarget).val();

        saveRatingOfAnime(a.url, dataURL, rating, await user.getRatingURLForAnime(a.url));
        console.log(a.url + ' ' + rating);
      } else {
        $(e.currentTarget).prop('checked', false);
        $('#notloggedin-modal').modal();
      }
    });

    $label.append($input);

    for (let j = 1; j <= i; j ++) {
      $label.append($(`<i class="fas fa-star"></i>`));
    }

    $form.append($label);
  }

  $footerText.append($form);

  $cardFooter.append($footerText);
  $card.append($cardFooter);

  $(`#all-anime`).append($card);
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
