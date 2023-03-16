# Filmic
Search for media for free online, with no ads!

#

## Disclaimer
Filmic is a search tool that interfaces with public, third-party websites and API endpoints in order to extract direct links to media. Filmic does not host any media files, nor does it claim ownership of any of the media it links to.

Please note that the media linked to by Filmic may be protected by copyright. It is the user's responsibility to ensure that they have the necessary rights to access and use any media they download using Filmic.

The developers of Filmic are not responsible for any legal consequences that may arise from the use of this tool to access copyrighted material.

#

## Try it out at [Filmic.app](https://filmic.app)
### Or try it on [Glitch](https://filmic.glitch.me) or [Replit](https://filmic.ayunami2000.repl.co)

#

## How does it work?

This script interfaces with public, third-party websites and API endpoints in order to extract a direct link to media, falling back to one of the backup URLs as needed.

#

## Usage
1. Clone this repository
2. Navigate to the project directory and run `npm install`
3. Start the script by running `npm start`
4. Open a web browser and navigate to `http://localhost:3000` to access it!

## Endpoints
This script provides the following endpoints:

### /search
This endpoint performs a search on the specified website based on the `q` and `s` query parameters.

#### Query Parameters
- `q` (required): The search query string
- `s` (required): The origin URL of the endpoint to search

#### Response
This endpoint returns a JSON object with the search results.

### /sdl
This endpoint performs a search on the specified website and redirects the user to the first result to download.

#### Query Parameters
- `q` (required): The search query string
- `s` (required): The origin URL of the endpoint to search
- `e` (optional): The episode number to download

### /dl/:url
This endpoint downloads the media file at the specified URL.

#### Path Parameters
- `url` (required): The URL of the media to download

#### Query Parameters
- `e` (optional): The episode number to download