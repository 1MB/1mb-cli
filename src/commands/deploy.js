const Static = require('../types/static')
const Vue = require('../types/vue')
const React = require('../types/react')

const glob = require('glob-gitignore')

const {Command, flags} = require('@oclif/command')
const Configstore = require('configstore')
const fs = require('fs')
const request = require('request')

const conf = new Configstore('1mb-cli')
const parse = require('parse-gitignore')
const {cli} = require('cli-ux')
const path = require('path')
const imgur = require('imgur')

// imgur.setClientId('aCs53GSs4tga0ikp');
imgur.setAPIUrl('https://api.imgur.com/3/')

class DeployCommand extends Command {
    async run() {
        const {flags} = this.parse(DeployCommand)
        const self = this

        if (flags.clearcreds === true) {
            conf.clear()
        }

        let username = conf.get('username')
        if (typeof username === 'undefined') {
            username = await cli.prompt('What is your 1mbsite username?')
        }

        let key = conf.get('key')
        if (typeof key === 'undefined') {
            key = await cli.prompt('What is your 1mbsite api key?', {
                type: 'mask'
            })

            if (await cli.confirm('Would you like to save these credentials for future deployments?')) {
                conf.set('key', key)
                conf.set('username', username)
                this.log('Saved credentials!')
            }
        }

        // clear all active resources | waiting for dalton to finish this api
        // request.post('https://api.1mb.site', {
        //     form: {
        //         action: 'deploy',
        //         site: username,
        //         key: key,
        //         resource: file,
        //         code: content
        //     }
        // }, function(error, response, body) {
        //     body = JSON.parse(body)

        //     if (body.error) {
        //         switch (body.error) {
        //             case 'ACCOUNT_BANNED':
        //                 cli.action.stop('ERROR: Account banned.');
        //                 break;
        //             case 'ACCOUNT_NONEXISTENT':
        //                 cli.action.stop('ERROR: Account doesn\'t exist.');
        //                 break;
        //             case 'STORAGE_QUOTA':
        //                 cli.action.stop('ERROR: Account storage depleted.');
        //                 break;
        //             case 'KEY_INCORRECT':
        //                 cli.action.stop('ERROR: Bad site key.');
        //                 break;
        //             case 'EMAIL_VERIFICATION':
        //                 cli.action.stop('ERROR: Email not verified.');
        //                 break;
        //             case 'KEY_INCLUDED':
        //                 cli.action.stop('ERROR: Site key found in code.');
        //                 break;
        //             case 'RESOURCE_INVALID':
        //                 cli.action.stop('ERROR: Invalid file name.');
        //                 break;
        //             case 'EXTENSION_INVALID':
        //                 cli.action.stop('ERROR: Unsupported file name extension.');
        //                 break;
        //             case 'RESOURCE_LONG':
        //                 cli.action.stop('ERROR: File name too long.');
        //                 break;
        //         }
        //     }

        //     let file;
        //     for (var i = body.data.length - 1; i >= 0; i--) {
        //     	file = body.data[i]

        //     	// TODO: DELETE FILE
        //     }
        // })

        // ignore npm files
        let ignore = [
        	'package.json',
        	'package-lock.json'
        ]

        let type
        if(flags.vuejs) {
        	this.log('Building vue...')

        	type = new Vue(
        		process.cwd(),
        		fs.existsSync(`${process.cwd()}/.gitignore`) ? parse(fs.readFileSync(`${process.cwd()}/.gitignore`)).concat(ignore) : ignore,
        		this,
        		flags.minify
        	)
        }
        else if(flags.reactjs) {
        	this.log('Building react...')

        	type = new React(
        		process.cwd(),
        		fs.existsSync(`${process.cwd()}/.gitignore`) ? parse(fs.readFileSync(`${process.cwd()}/.gitignore`)).concat(ignore) : ignore,
        		this,
        		flags.minify
        	)
        }
        else {
        	type = new Static(
        		process.cwd(),
        		fs.existsSync(`${process.cwd()}/.gitignore`) ? parse(fs.readFileSync(`${process.cwd()}/.gitignore`)).concat(ignore) : ignore,
        		this,
        		flags.minify
        	)
        }

        let files = await type.files()
        let cwd;
        if(flags.vuejs) {
        	cwd = process.cwd() + '/dist/'
        }
        else if(flags.reactjs) {
        	cwd = process.cwd() + '/build/'
        }
        else {
        	cwd = process.cwd();
        }

        let image_files = []
        let images = []
        await glob.glob(['*.png', '*/*.png', '*.jpg', '*/*.jpg', '*.gif', '*/*.gif'], {cwd: cwd}).then(imgs => {
            for (var i = imgs.length - 1; i >= 0; i--) {
                image_files[i] = `${imgs[i]}`
            }
        })

        for (var i = image_files.length - 1; i >= 0; i--) {
            await imgur.uploadFile(`${cwd}/${image_files[i]}`).then(json => {
                images[i] = {
                    path: image_files[i],
                    url: json.data.link
                }
            })
        }

        // check if pro before pushing files | might use this later
        // let pro = request.post('https://api.1mb.site', {
        //     form: {
        //         action: 'pro',
        //         site: username,
        //         key: key
        //     }
        // }, (error, response, body) => {
        // 	return body.error || error;
        // })

        cli.action.start('Deploying...')

        let file, content, name;
        for (var i = files.length - 1; i >= 0; i--) {
        	file = files[i]

        	content = file['contents']
        	name = file['name']

        	// replace image links
            for (var n = images.length - 1; n >= 0; n--) {
                content = await content.split(`${images[n]['path']}`).join(images[n]['url'])

                if(flags.vuejs) {
                	// fix images with vue
                	content = await content.split(`r.p+"img/${path.basename(images[n]['path'])}`).join(`"${images[n]['url']}`)
                }
            }

            // fix vue
            content = await content.split('r.p+').join('')

            request.post('https://api.1mb.site', {
                form: {
                    action: 'deploy',
                    site: username,
                    key: key,
                    resource: name,
                    code: content
                }
            }, (error, response, body) => {
                body = JSON.parse(body)

                if (body.error) {
                    switch (body.error) {
                        case 'ACCOUNT_BANNED':
                            cli.action.stop('ERROR: Account banned.');
                            break;
                        case 'ACCOUNT_NONEXISTENT':
                            cli.action.stop('ERROR: Account doesn\'t exist.');
                            break;
                        case 'STORAGE_QUOTA':
                            cli.action.stop('ERROR: Account storage depleted.');
                            break;
                        case 'KEY_INCORRECT':
                            cli.action.stop('ERROR: Bad site key.');
                            break;
                        case 'EMAIL_VERIFICATION':
                            cli.action.stop('ERROR: Email not verified.');
                            break;
                        case 'KEY_INCLUDED':
                            cli.action.stop('ERROR: Site key found in code.');
                            break;
                        case 'RESOURCE_INVALID':
                            cli.action.stop('ERROR: Invalid file name.');
                            break;
                        case 'EXTENSION_INVALID':
                            cli.action.stop('ERROR: Unsupported file name extension.');
                            break;
                        case 'RESOURCE_LONG':
                            cli.action.stop('ERROR: File name too long.');
                            break;
                    }
                }
            })
        }
    }
}

DeployCommand.description = `Deploy your files to 1mbsite`

DeployCommand.flags = {
    minify: flags.boolean({
        description: 'Minify all resources before pushing to 1mbsite'
    }),
    clearcreds: flags.boolean({
        description: 'Clear cached 1mbsite credentials and reauthenticate'
    }),
    vuejs: flags.boolean({
        description: 'Automatically build and deploy a VueJS application'
    }),
    reactjs: flags.boolean({
        description: 'Automatically build and deploy a VueJS application'
    })
}

module.exports = DeployCommand