const glob = require('glob-gitignore')
const notifier = require('node-notifier')

const {Command, flags} = require('@oclif/command')
const Configstore = require('configstore')
const pkg = require('../../package.json')
const fs = require('fs')
const request = require('request')

const conf = new Configstore(pkg.name)
const parse = require('parse-gitignore')
const {cli} = require('cli-ux')
const minify = require('minify')
const path = require('path')
const imgur = require('imgur')

// imgur.setClientId('aCs53GSs4tga0ikp');
imgur.setAPIUrl('https://api.imgur.com/3/')

class DeployCommand extends Command {
  async run() {
    const {flags} = this.parse(DeployCommand)

    if(flags.clearcreds === true) {
    	conf.clear()
    }

    var username = conf.get('username')
    if(typeof username === 'undefined') {
    	var username = await cli.prompt('What is your 1mbsite username?')
    }

    var key = conf.get('key')
    if(typeof key === 'undefined') {
    	var key = await cli.prompt('What is your 1mbsite api key?', {type: 'mask'})

    	if(await cli.confirm('Would you like to save these credentials for future deployments?')) {
    		conf.set('key', key)
    		conf.set('username', username)
    		this.log('Saved credentials!')
    	}
    }

	const replace = []
	if(flags.vuejs) {
		await glob.glob('*/', {cwd: process.cwd()}).then(dirs => {
			for (var i = 0, len = dirs.length; i < len; i++) {
				replace[i] = `/${dirs[i]}`
			}
		})
	}

	const image_files = []
	const images = []
	await glob.glob(['*.png', '*/*.png', '*.jpg', '*/*.jpg', '*.gif', '*/*.gif'], {cwd: process.cwd()}).then(imgs => {
		for (var i = 0, len = imgs.length; i < len; i++) {
			image_files[i] = `${imgs[i]}`
		}
	})

	for (var i = 0, len = image_files.length; i < len; i++) {
		await imgur.uploadFile(`${process.cwd()}/${image_files[i]}`).then(function(json) {
			images[i] = {
				path: image_files[i],
				url: json.data.link
			}
		})
	}

	// check if pro before pulling files
	request.post('https://api.1mb.site', {form: {
		action: 'deploy',
		site: username,
		key: key,
		resource: file,
		code: minified
	}}, async (error, response, body) => {
		body = JSON.parse(body)

		let search = [];
		if(body.error) {
			search = flags.vuejs ? ['*.{html,css,js}', '*/*.{css,js}'] : '*.{html,css,js}';
		}
		else {
			search = flags.vuejs ? ['*.{html,css,js,png,jpg,gif}', '*/*.{css,js,png,jpg,gif}'] : '*.{html,css,js,png,jpg,gif}'
		}

		const self = this
	    await glob.glob(search, {cwd: process.cwd(), ignore: fs.existsSync(`${process.cwd()}/.gitignore`) ? parse(fs.readFileSync(`${process.cwd()}/.gitignore`)) : []}).then(files => {
	    	if(files.length === 0) {
	    		return self.log('Unable to find any html,css, or js files in your current directory')
	    	}

	    	cli.action.start(`Deploying ${files.length} files to 1mbsite..`)

			for (var i = 0, len = files.length; i < len; i++) {
				let file = files[i]

				if(flags.minify) {
					minify(`${process.cwd()}/${file}`).then(minified => {
						request.post('https://api.1mb.site', {form: {
							action: 'deploy',
							site: username,
							key: key,
							resource: file,
							code: minified
						}}, function (error, response, body) {
							body = JSON.parse(body)
							
						    if(body.error) {
						        switch(body.error) {
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

						    if(i === files.length && !body.error) {
								cli.action.stop('Deployment successful!')

							    notifier.notify({
							      title: 'Deployment Successful!',
							      message: 'We deployed the latest file versions to your website!'
							    })
						    }
						})
					})
				}
				else if(replace.length !== 0) {
					var contents = fs.readFileSync(`${process.cwd()}/${file}`, 'utf8')
					for (var n = 0, len = replace.length; n < len; n++) {
						contents = contents.split(replace[n]).join('/')
					}

					for (var n1 = 0, len1 = images.length; n1 < len1; n1++) {
						contents = contents.split(images[n1]['path']).join(images[n1]['url']).split(`/${images[n1]['path']}`).join(images[n1]['url'])
					}

					request.post('https://api.1mb.site', {form: {
						action: 'deploy',
						site: username,
						key: key,
						resource: path.basename(file),
						code: contents
					}}, function (error, response, body) {
						body = JSON.parse(body)
						
					    if(body.error) {
					        switch(body.error) {
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

					    if(i === files.length && !body.error) {
							cli.action.stop('Deployment successful!')

						    notifier.notify({
						      title: 'Deployment Successful!',
						      message: 'We deployed the latest file versions to your website!'
						    })
					    }
					})
				}
				else {
					request.post('https://api.1mb.site', {form: {
						action: 'deploy',
						site: username,
						key: key,
						resource: file,
						code: fs.readFileSync(`${process.cwd()}/${file}`, 'utf8')
					}}, function (error, response, body) {
						body = JSON.parse(body)
						
					    if(body.error) {

					        switch(body.error) {
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

					    if(i === files.length && !body.error) {
							cli.action.stop('Deployment successful!')

						    notifier.notify({
						      title: 'Deployment Successful!',
						      message: 'We deployed the latest file versions to your website!'
						    })
					    }
					})
				}
			}
	    })
	})
  }
}

DeployCommand.description = `Deploy your files to 1mbsite`

DeployCommand.flags = {
	clear: flags.boolean({description: 'Clear all resources actively hosted on 1mbsite (use this if you\'ve deleted files)'}),
	minify: flags.boolean({description: 'Minify all resources before pushing to 1mbsite'}),
	clearcreds: flags.boolean({description: 'Clear cached 1mbsite credentials and reauthenticate'}),
	vuejs: flags.boolean({description: ''})
}

module.exports = DeployCommand
