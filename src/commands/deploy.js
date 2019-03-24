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

    glob.glob('*.{html,css,js}', {cwd: process.cwd(), ignore: fs.existsSync(`${process.cwd()}/.gitignore`) ? parse(fs.readFileSync(`${process.cwd()}/.gitignore`)) : []}).then(files => {
    	if(files.length === 0) {
    		return this.log('Unable to find any html,css, or js files in your current directory')
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
  }
}

DeployCommand.description = `Deploy your files to 1mbsite`

DeployCommand.flags = {
	clear: flags.boolean({description: 'Clear all resources actively hosted on 1mbsite (use this if you\'ve deleted files)', default: true}),
	minify: flags.boolean({description: 'Minify all resources before pushing to 1mbsite'}),
	clearcreds: flags.boolean({description: 'Clear cached 1mbsite credentials and reauthenticate'})
}

module.exports = DeployCommand
