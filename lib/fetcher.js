/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const namespaces = require('prefix-ns').asMap();
const Comunica = require('@comunica/actor-init-sparql');
const Q = require('q');
const LDFetch = require('ldfetch');
const auth = require('solid-auth-client');
const N3 = require('n3');

class Fetcher {

  getRandomAnime(amount, cb) {
    const resultUrls = [];
    const query = `SELECT * {
      ?s ?p <${namespaces.dbo}Anime>;
      <${namespaces.dbo}title> ?title;
      <${namespaces.schema}image> ?image;
      <${namespaces.schema}description> ?description.
      FILTER langMatches( lang(?title), "EN" )
      } LIMIT ${amount}`;

    const myEngine = Comunica.newEngine();

    myEngine.query(query,
      { sources: [ { type: 'hypermedia', value: 'https://data.betweenourworlds.org/latest' } ] })
      .then(function (result) {
        result.bindingsStream.on('data', data => {
          data = data.toObject();

          const url = data['?s'].value;

          if (resultUrls.indexOf(url) === -1) {
            resultUrls.push(url);

            cb({
              title: data['?title'].value,
              url,
              image: data['?image'].value,
              description: data['?description'].value
            });
          }
        });
      });
  }

  async getDetailsOfAnime(animeURL) {
    const ldfetch = new LDFetch();
    const result = {url: animeURL};

    let response = await ldfetch.get(animeURL);

    for (let i = 0; i < response.triples.length; i ++) {
      let triple = response.triples[i];

      if (triple.subject.value === animeURL) {
        if (triple.predicate.value === `${namespaces.dbo}title`) {
          if (triple.object.language === 'en' || !result.title) {
            result.title = triple.object.value;
          }
        } else if (triple.predicate.value === `${namespaces.schema}image`) {
          result.image = triple.object.value;
        } else if (triple.predicate.value === `${namespaces.schema}description`) {
          result.description = triple.object.value;
        }
      }
    }

    return result;
  }

  getUserDataInStore(url) {
    const deferred = Q.defer();

    auth.fetch(url)
      .then(async res => {
        if (res.status === 404) {
          deferred.reject(404);
        } else {
          const body = await res.text();
          const userDataStore = N3.Store();
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
        }
      });

    return deferred.promise;
  }
}

module.exports = Fetcher;