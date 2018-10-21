/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const auth = require('solid-auth-client');
const elasticlunr = require('elasticlunr');
const User = require('./lib/user');
const Fetcher = require('./lib/fetcher');
const saveRatingOfAnime = require('./lib/updater').saveRatingOfAnime;

const fetcher = new Fetcher();
let user = null;
let counter = 0;
const anime = {};
const animeUrls = [];
let randomAnimeLoaded = false;
const elasticSearchIndex = elasticlunr(function () {
  this.addField('title');
  this.addField('description');
  this.setRef('id');
});

auth.trackSession(async session => {
  const loggedIn = !!session;
  console.log(`logged in: ${loggedIn}`);

  if (loggedIn) {
    $('#login-btn').hide();
    $('#user-menu').show();

    user = new User(session.webId);

    $('#dataurl').val(user.getPodURL());
    $('#dataurl-modal').modal();
  } else {
    $('#user-menu').hide();
    $('#login-btn').show();

    if (!randomAnimeLoaded && !user) {
      $('#tpf-alert').removeClass('hide hidden').addClass('show');

      setTimeout(() => {
        $('#tpf-alert').removeClass('show').addClass('hide hidden');
      }, 10000);

      fetcher.getRandomAnime(12, result => {
        const id = addAnime(result);
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

$('#save-dataurl-btn').click(() => {
  user.setDataURL($('#dataurl').val());
  $('#user-solid-pod').prop('href', user.getDataURL());
  $('#dataurl-modal').modal('hide');
  $('#dataurl-modal .modal-body p:first-child').addClass('hidden');
  loadUserAnime();
});

$('#dataurl').keypress(function (e) {
  const key = e.which;

  if(key === 13){
    $('#save-dataurl-btn').click();
    return false;
  }
});

$('#see-data-btn').click(() => {
  window.open(user.getDataURL(), '_blank');
});

$('#srch-btn').click(async function() {
  const value = $('#srch-term').val();
  $('#no-results').removeClass('show').addClass('hide hidden');

  if (value !== undefined) {
    if (value === "") {
      //show everything
      showOnlyAnimeWithIDs(Object.keys(anime));
    } else if (value.startsWith('http://') || value.startsWith('https://')) {
      if (animeUrls.indexOf(value) === -1) {
        //fetch data
        //todo
        console.log(value);
        const result = await fetcher.getDetailsOfAnime(value);
        const id = addAnime(result);
        //we remove all other anime
        showOnlyAnimeWithIDs([]);
        //show only the one we just added
        addAnimeToPage(result, id);
      } else {
        //show only one in the list
        let i = 0;
        const keys = Object.keys(anime);

        while (i < keys.length && anime[keys[i]].url !== value) {
          i++;
        }

        showOnlyAnimeWithIDs([keys[i]]);
      }
    } else {
      const results = elasticSearchIndex.search(value).map(a => a.ref);

      if (results.length === 0) {
        $('#no-results').removeClass('hide hidden').addClass('show');
      }

      showOnlyAnimeWithIDs(results);
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

$('#clr-srch-btn').click(() => {
  $('#no-results').removeClass('show').addClass('hide hidden');
  showOnlyAnimeWithIDs(Object.keys(anime));
  $('#srch-term').val('');
});

async function loadUserAnime() {
  try {
    user.setStore(await fetcher.getUserDataInStore(user.getDataURL()));
    // addAnimeToPage(await fetcher.getDetailsOfAnime('https://betweenourworlds.org/anime/gochuumon-wa-usagi-desu-ka'), 2);

    $('#pod-alert').removeClass('hide hidden').addClass('show');

    setTimeout(() => {
      $('#pod-alert').removeClass('show').addClass('hide hidden');
    }, 60000);

    const animeURLs = user.getAllAnimeURLs();

    animeURLs.forEach(async a => {
      if (animeUrls.indexOf(a) === -1) {
        const result = await fetcher.getDetailsOfAnime(a);
        const id = addAnime(result);
        addAnimeToPage(result, id);
      } else {
        console.info(`The anime with iri ${a} is already displayed => not added`);
        let i = 0;
        let ids = Object.keys(anime);

        while (i < ids.length && anime[ids[i]].url !== a) {
          i++;
        }

        let rating = await user.getRatingForAnime(a);

        if (rating) {
          $(`#${ids[i]}-rating-${rating}`).prop('checked', true);
        }
      }
    });
  } catch (e) {
    $('#dataurl-modal .modal-body p:first-child').removeClass('hidden');
    $('#dataurl-modal').modal();
  }
}

async function addAnimeToPage(a, id) {
  const $card = $(`<div id="anime-${id}" class="card"></div>`);
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
    let input = `<input id="${id}-rating-${i}" type="radio" name="stars" value="${i}"`;

    if (i === rating) {
      input += ` checked`;
    }

    input += ' />';
    const $input = $(input);

    $input.change(async (e) => {
      if (user) {
        const rating = $(e.currentTarget).val();

        saveRatingOfAnime(a.url, user.getDataURL(), rating, await user.getRatingURLForAnime(a.url), user.getWebID());
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

function showOnlyAnimeWithIDs(ids) {
  const $cards = $('#all-anime > .card');

  //remove the ones that are shown but should not
  $.each($cards, (index, $card) => {
    const animeID = $card.id.replace('anime-', '');

    if (ids.indexOf(animeID) === -1) {
      $card.remove();
    } else {
      ids.splice(ids.indexOf(animeID), 1);
    }
  });

  //add the ones that are not shown by should
  ids.forEach(id => {
    addAnimeToPage(anime[id], id);
  });
}

function addAnime(result) {
  const id = counter;
  counter++;

  anime[id] = result;
  animeUrls.push(result.url);
  result.id = id;
  elasticSearchIndex.addDoc(result);

  return id;
}