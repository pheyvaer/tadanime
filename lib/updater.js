/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const auth = require('solid-auth-client');

function saveRatingOfAnime(animeURL, dataURL, rating, ratingURL) {
  if (ratingURL) {
    //we update the rating

    const updateQuery = `
    DELETE DATA
    { 
      <${ratingURL}> <http://schema.org/ratingValue> ?p.
    } WHERE {<${ratingURL}> <http://schema.org/ratingValue> ?p.}
    
    INSERT DATA
    { 
      <${ratingURL}> <http://schema.org/ratingValue> "${rating * 2}".
    }
    `;

    console.log(updateQuery);

    auth.fetch(dataURL, {
      method: 'PATCH',
      body: updateQuery,
      headers: {
        'Content-Type': 'application/sparql-update'
      }
    }).then(res => res.text())
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

module.exports = {
  saveRatingOfAnime
};