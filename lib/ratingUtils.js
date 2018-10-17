/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Comunica = require('@comunica/actor-init-sparql-rdfjs');
const Q = require('q');
const namespaces = require('prefix-ns').asMap();

function getRatingURLForAnime(animeURL, store) {
  const deferred = Q.defer();

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

  return deferred.promise;
}

function getRatingOfUserForAnime(animeURL, store) {
  const deferred = Q.defer();

  const source = {
    match: function (s, p, o, g) {
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
    {sources: [{type: 'rdfjsSource', value: source}]})
    .then(function (result) {
      result.bindingsStream.on('data', function (data) {
        // Each data object contains a mapping from variables to RDFJS terms.
        console.log(data.get('?ratingValue'));
        let result = parseInt(data.get('?ratingValue').value) / 2;

        if (isNaN(result)) {
          result = null;
        }

        deferred.resolve(result);
      });
    });


  return deferred.promise;
}

module.exports = {
  getRatingURLForAnime,
  getRatingOfUserForAnime
};