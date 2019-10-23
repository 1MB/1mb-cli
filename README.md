# 1mb-cli

1mb-cli is an NPM package that allows you to quickly and easily deploy content to static sites via your terminal. It was built to help improve and expand 1mbsite. Not only can it deploy content but it will auto minify all resources to save storage.

## Install

You can install 1mb-cli with the following command:
```shell
npm install --global 1mb-cli
```

Or you can download the latest tarball from the Releases page.

## Usage

Cd into your websites directory and run `1mb-cli deploy`. It will prompt you for your account username and api key and ask you if you'd like to cache them.

## Upgrade Guide

If you're running a version of `1mb-cli` older than `2.0.0` you can use the following command to upgrade:
```shell
npm install --global 1mb-cli
```

If you're using `2.0.0` or newer you can simply upgrade with `1mb-cli update`

Note: The upgrade command will not work if you are using a tarball.

## Optional Flags

| Flag | Description |
|---|---|
| `--vuejs` | Auto build and deploy a Vue application. Note: you must be in the root directory of your application |
| `--reactjs` | Auto build and deploy a React application. Note: you must be in the root directory of your application |
| `--minify` | Minify all HTML/CSS/JS files. Note: This flag is useless if the `--vuejs` or `--reactjs` flags are used with it |
| `--clearcreds` | Clear saved credentials and reauthenticate |
| `--clear-files` | Clear all site resources currently on 1MB before deploying. Note: this param doesn't do anything when mixed with `--vuejs` or `--reactjs` because those params delete all resources. |
