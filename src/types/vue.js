const glob = require('glob-gitignore')
const fs = require('fs')
const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

class Vue {

	constructor(directory, ignore, log, minify = true) {
		this.directory = directory
		this.ignore = ignore
		this.log = log
		this.minify = true
	}

	async files () {
		const log = this.log
		const search = ['*.{html,css,js}', '*/*.{html,css,js}']; //search first subdirectory (vue typically builds there) todo: add custom directory support
		
		const {error, stdout, stderr} = await exec(this.minify ? 'npm run build' : 'npm run build')

		log.log(stdout)
		log.log(stderr)

		let replace = [];
		await glob.glob('*/', {cwd: this.directory + '/dist/'}).then(dirs => {
			for (var i = 0, len = dirs.length; i < len; i++) {
				replace[i] = `/${dirs[i]}`
			}
		})

		let files = await glob.glob(search, {cwd: this.directory + '/dist/', ignore: this.ignore}).then(files => {
			let file, contents;
			for (var i = files.length - 1; i >= 0; i--) {
				file = files[i]

	            contents = fs.readFileSync(`${process.cwd()}/dist/${file}`, 'utf8')
	            for (var n = replace.length - 1; n >= 0; n--) {
	            	contents = contents.split(replace[n]).join('/')
	            }

                files[i] = {
                	name: path.basename(file),
                	contents: contents
                }
			}

			return files
		})

		return files;
	}
}

module.exports = Vue