# MigrationWithCopilot

This project serves as a demonstration of how to use GitHub Copilot to assist in migrating code from one cfw major version to another. It was initially built with @ucfw versions 4.0.9 and updated to 5.0.0-beta.7 using GitHub Copilot.

It includes a simple demo page with some components that were affected by breaking changes in the new major version:

- `u-alert`: this was using a deprecated API which was removed in v4
- `u-calendar`: this component was entirely removed in v5 and needs to be replaced with `u-new-calendar`
- `u-tree-select`: this component was moved to the `@ucfw/experimental` package which was introduced in v5

## How this was done

### Setup
I used the Copilot extension in VS Code in **Plan Mode** and with **Claude Opus 4.6**, which is the most capable model at the time of writing. 

### Prompt
Following prompt was used initially:

```
I need to update the @ucfw scoped dependencies of this project from 4.0.9 to 5.0.0-beta.7. These dependencies are company-internal packages. As this is a major version change, there will likely be breaking changes that may break this app.
We do have an internal documentation website that includes versioned changelogs, migration guides, api documentation and many demos. You can access the migration guide from version 4 to 5 here: https://orbis-u-guide.dedalus.lan/v5/#/overview/migration/v4-v5
If you need more references from this guide, DO NOT try to discover it yourself. Ask me and i will provide the correct links to you.

Create a detailed implementation plan, that focuses on possible pitfalls and problems and that also makes sure to test that the project still builds afterwards. 
```

### Refining the plan
Copilot started checking the linked migration guide and then iterated with me over some questions, e.g. to provide more links to API documentation for the affected components. After a few iterations, it created a detailed implementation plan.

### Implementation
Following the implementation plan, copilot updated the dependencies and code step by step, without me needing to give feedback. It also ran `ng build` and `ng test` iteratively and fixed the issues that came up.

## Result
The code was successfully updated to use the new major version of the dependencies and the demo page was working as expected with the new versions of the components.
It also fixed the tests (which were broken before, because I did not update when i added the demo components).

The complete chat log can be found [here](./chat-log.md).


