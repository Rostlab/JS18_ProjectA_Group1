# About Swagger: API documentation
Swagger-UI is used to document the implemented APIs. 

## What is Swagger?
Swagger is a collection of open-source tools build around [OpenAPI](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md). 
OpenAPI itself is a specification which determines how to document REST APIs.
A compliant description can be used to document an API and for example used to generate working clients
for the interface in many programming languages.

The API-description file for this project can be found in {project-root}/server/docs/api-docs.json

Swagger-UI enhances this functionality by
providing a website which can be used as a client for calling
 the API ([Project API documentation / Swagger UI](https://js2018-group1.azurewebsites.net/API/documentation)). For generating the website the API description file is used.

The third library which was used for setting up swagger-ui on node is [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express) 

## Current status
### Enpoints
- /API/datasets         
- /API/columns          
- /API/examples 
- /API/nlp
- /API/classifyTokens   (for internal tests - not documented)
    