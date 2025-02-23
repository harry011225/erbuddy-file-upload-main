# ERBuddy File Upload

### This is the backend that lets users upload their files and download their files in a secure manner

## To Run
0. Make a folder called uploads in the root of this folder, thats where the users files will go to when they upload/download files
1. Create a .env file that should have the MASTER_KEY to encrypt and decrypt files that users upload. You can generate this MASTER_KEY by doing a get request to localhost:3000/getKey
.env shoud look something like below
```
MASTER_KEY=934c30ad51a2da1a7b4badf458000208e44c2a5691986c116fb7174b945ac725 # used to encrypt and decrypt files
```
2. Run `npm install` to install the project packages
3. Run `npm run start:dev` to start the nestjs backend
4. Use a app like Postman to test the requests to the endpoints. 
- The endpoints are found in app.controller, GET, POST, etc

