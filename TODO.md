# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes

## Today

### Second Prompt for LLM

Remember to replace XXXXXX with the name of the entity that you want to replace. Like "partner".

```
Using the description at the top of the @README.md file, replace the @Demo.java entity, @DemoService.java , @DemoResource.java  and all the related stuff in the @src/main/webui  folder like @demo.component.ts , etc.  with a new CRUD service for the XXXXXX entity.

That Entity should have the following properties:

- name
- description
- website
- phone
- email
- address
- city
- state
- zip
- country
```


## Tomorrow

- [ ] - remove all references to `demo` in the entire project
- [ ] - remove all files with `demo` in their name
- [ ] - Update README.md with project-specific information
- [ ] - Update DATABASE.md with project-specific information
- [ ] - Search for TODO and fix
- [ ] - Create favicon, store it in root as zip and put it in `src/main/webui/public`
- [ ] - Replace `src/main/webui/src/app/demo` with project-specific components
- [ ] - Update database migration files
- [ ] - Update clear-test-db.sh


## Later (not yet necessary for initial release)

