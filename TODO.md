# TODO

TODOs to be resolved by the developer, NOT THE LLM.

## Today


## Tomorrow


## Later (not yet necessary for initial release)


# TODOs for Abstracore (to be deleted downstream)

- add observability (logging, metrics, tracing)
- fix tracking of the url in the auth service, so that if the user clicks or enters a link, they are redirected, regardless of whether they are already signed in, or need to sign in



i need to add observability to this quarkus application. please search the quarkus documentation in order to find out how to do this. i am targeting grafana loki. i need to be able to read logs and view telemetry data like traces and spans. spans should be enriched with error data if there is an error. i need to see the SQL statements which are executed when the component calls the database - the SQL should be added to spans. i believe that quarkus can do all of that. it should be configured to send its logs to loki.

as well as making the changes, add a markdown to @docs/ephemeral-and-volatile-and-temporary-but-interesting  which describes how this works and what i need to do in order to get grafana infrastructure working in docker locally in order to test it.