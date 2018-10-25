/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const auth = require('solid-auth-client');
const uniqid = require('uniqid');

function saveRatingOfAnime(animeURL, dataURL, rating, ratingURL, webid) {
  let updateQuery;

  if (ratingURL) {
    //we update the rating
    updateQuery = `
    DELETE DATA
    { 
      <${ratingURL}> <http://schema.org/ratingValue> ?p.
    } WHERE {<${ratingURL}> <http://schema.org/ratingValue> ?p.}
    
    INSERT DATA
    { 
      <${ratingURL}> <http://schema.org/ratingValue> "${rating * 2}".
    }
    `;
  } else {
    //need new action, review and rating objects
    const uniqueID = uniqid();
    const baseURL = dataURL + '#' + uniqueID + '-';
    const actionURL = baseURL + 'action';
    const reviewURL = baseURL + 'review';
    const ratingURL = baseURL + 'rating';

    updateQuery = `   
       
    INSERT DATA
    { 
      <${actionURL}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> 
          <http://schema.org/Action>, <http://schema.org/ConsumeAction>, <http://schema.org/WatchAction>, <http://schema.org/Thing>;
        <http://schema.org/object> <${animeURL}>;
        <http://schema.org/agent> <${webid}>;
        <http://schema.org/review> <${reviewURL}>.
        
      <${reviewURL}>  <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/CreativeWork>, <http://schema.org/Review>, <http://schema.org/Thing>;
        <http://schema.org/starRating> <${ratingURL}>.
      
      <${ratingURL}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/Intangible>, <http://schema.org/Rating>, <http://schema.org/Thing>;
        <http://schema.org/ratingValue> "${rating * 2}";
        <http://schema.org/worstRating> "1";
        <http://schema.org/bestRating> "10";
    }
    `;
  }

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