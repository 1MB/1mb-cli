# 1mb-cli

1mb-cli is an NPM package that allows you to quickly and easily deploy content to static sites via your terminal. It was built to help improve and expand 1mbsite. Not only can it deploy content but it will auto minify all resources to save storage.

## Install

You can install 1mb-cli with the following command:
```shell
npm install --global 1mb-cli
```

## Usage

Cd into your websites directory and run `1mb deploy`. It will prompt you for your account username and api key and ask you if you'd like to cache them. It accepts the `--minify` parameter to autominify resources and the `--clearcreds` param to clear saved credentials.
