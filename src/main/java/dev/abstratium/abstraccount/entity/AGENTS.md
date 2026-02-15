This package contains JPA entity classes that represent the persistence model.

They are not to be exposed via JSON to the UI.
They are not to be used as models in the application.
They are used purely for persistence.

The client should be able to load the journal without loading the accounts and transactions or tags.

The client should be able to load the accounts without loading the transactions or tags.

The client should be able to load the transactions which should include their entries and tags.

The client should be able to modify individual entities without loading the entire graph.

The client should be able to delete individual entities without loading the entire graph.

The client should be able to create individual entities without loading the entire graph.

It is OK to map from entities directly to DTOs.
