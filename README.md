# Tadanime

Tadanime is a proof of concept of a decentralized anime rating Web application.
It makes use of Linked Open Data to display information of the anime to the user.
It uses a user's Solid POD to get the user's ratings of anime.
Thus, no server-side logic is required for the application
as both the information about the anime and the personal information of the user
is stored on different servers.

## Used technologies/concepts

- [Linked Open Data](https://www.w3.org/DesignIssues/LinkedData.html): get details of anime ([Between Our Worlds](https://betweenourworlds.org))
- Decentralization: information is fetched from different servers
- [Solid PODs](https://solid.inrupt.com/get-a-solid-pod): get user's rating of anime
- [SPARQL](): query/update user's ratings
- [RDF](https://www.w3.org/TR/rdf11-concepts/): representation of the data
- [Triple Pattern Fragments](http://linkeddatafragments.org/concept/): Between Our Worlds offers a TPF endpoint
- [Comunica](https://github.com/comunica/): querying different data sources

## License

© 2018 [Pieter Heyvaert](https://pieterheyvaert.com), [MIT License](https://github.com/pheyvaer/tadanime/blob/master/LICENSE.md)