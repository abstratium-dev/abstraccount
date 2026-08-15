# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes
- audit that all JPQL and SQL is multi-tenant conform
  - prompt:
    - you are a software expert and know all about hibernate multitenancy using the discriminator approach, as well as envers. see @entity-manager-usage-constraints.md and ensure that the information in that file is adhered to in this project. for example: search for all native sql in `src/main/java` and tell the user that they exists and suggest updates so that JPA queries are used instead. for example: search for all bulk UPDATE and DELETE operations and tell the user that they exist and suggest updates so that non-bulk operations are used instead. you are free to address other potential issues related to using envers and multi-tenancy.
- double check that the legal.component.html still conforms in terms of what the site does and which data is collected

## Today

- update JWT/OIDC token verification settings (mp.jwt.verify.audiences, mp.jwt.verify.issuer) in all downstream abstracore-based repositories to match the abstrauth token issuer/audience per stage

- use SecurityProblemLogger in all places where a security issue is detected
- add multitenancy by using the document MULTITENANCY_IMPLEMENTATION_CHECKLIST.md

## Tomorrow


## Later (not yet necessary for initial release)


# TODOs for Abstracore (to be deleted downstream)

- add this to end of angular.md in .devis/rules:

    ## Zoneless change detection

    This app uses `provideZonelessChangeDetection()` (no Zone.js). State changes must explicitly notify Angular.

    - **New components must use `ChangeDetectionStrategy.OnPush`** — never `Eager` or `Default`. Convert existing components to `OnPush` when you modify them.
    - **Template-bound mutable state must be a signal.** Use `signal()` for flags, form state, and copy-to-clipboard states; use `model()` for two-way bindings. Read in templates with `()`, and write with `.set()` / `.update()`. Plain fields that change after first render will cause `ExpressionChangedAfterItHasBeenCheckedError` or stale UI.
    - **Keep async results in the model.** HTTP results go through the `Controller` into `ModelService` signals; components read them via `modelService.foo$()`.
    - **React to signal changes with `effect()`**, not `ngOnChanges` or manual subscriptions.
    - **Avoid `NgZone` APIs** such as `onStable`, `onMicrotaskEmpty`, `onUnstable`, and `isStable` — they do not emit in zoneless mode.
    - **In tests, always provide `provideZonelessChangeDetection()`** in `TestBed`. Prefer `await fixture.whenStable()` over `fixture.detectChanges()`. If a test mutates plain state, expect `ExpressionChangedAfterItHasBeenCheckedError`.




- search all env files for "noreply" and don't use that!
- add to application.properties - but change so that stage is in there so that i can't accidentally use a test token in prod (if the secret were the same one)
  - this can be done using the stage prop in abstrauth and all abstracore apps
  - quarkus.oidc.token.audience=$stage-${ABSTRATIUM_CLIENT_ID:abstratium-abstracore}
  - quarkus.oidc.token.issuer=https://$stage-abstrauth.abstratium.dev


- add version field and optimistic locking to all entities and always take the version from the client. write a doc about this and add it to abstracore and implement it as standard in the database.md file.
  - apply versioning to
    - abstrauth
    - abstrapact
    - abstraccount
    - abstrapact
    - abstracertification
    - abstracore itself in demo
    - abstradocs (coming soon) and others too

- allow other addresses than localhost to read management/metrics. need to also expose it in docker file?

- help in the framework so that products have a help page

- add a link to the sbom in readme: e.g. https://github.com/abstratium-dev/abnemo/dependency-graph/sbom. although a copy needs adding to the release! what does the law say?

- add observability (logging, metrics, tracing)
  - see https://quarkus.io/quarkus-workshop-langchain4j/section-1/step-10/#tracing

    # quarkus.otel.exporter.otlp.traces.endpoint=http://localhost:4317
    quarkus.otel.exporter.otlp.traces.headers=authorization=Bearer my_secret 
    quarkus.log.console.format=%d{HH:mm:ss} %-5p traceId=%X{traceId}, parentId=%X{parentId}, spanId=%X{spanId}, sampled=%X{sampled} [%c{2.}] (%t) %s%e%n  
    # enable tracing db requests
    quarkus.datasource.jdbc.telemetry=true

- fix security testing
  - use # Disable OIDC tenant in test mode to allow @TestSecurity to work without 302 redirects
        %test.quarkus.oidc.tenant-enabled=false
    in application.properties and then add     @TestSecurity(user = "testUser", roles = {Roles.USER})
    to any tests that need security 
