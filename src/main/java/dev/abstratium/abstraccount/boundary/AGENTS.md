This package contains REST resource classes and DTO classes used to expose the business model from the "model" package, to the UI.

They are exposed via JSON to the UI.
They are not used for persistence.
They are not used as models in the application.

It is OK to map from entities directly to DTOs.

Remember to annotate DTO classes with `io.quarkus.runtime.annotations.RegisterForReflection` so that they work when we build a native docker image.