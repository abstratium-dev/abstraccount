This package contains classes that represent the core business model.

They may contain cyclic references. They may contain small amounts of business logic, like validation, or getting hold of a string representation of a path to a root object.

They are not intended to be used as entities in a database. They are not intended to be exposed via JSON to the UI. They are intended to be used as models in the application.