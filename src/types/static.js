const glob = require('glob-gitignore')
const fs = require('fs')
const path = require('path')

class Static {

	constructor(directory, ignore, log, minify = true) {
		this.directory = directory
		this.ignore = ignore
		this.log = log
		this.minify = true;
	}

	async files () {
		const log = this.log
		const search = '*.{html,css,js,png,jpg,gif}'
		const self = this;

		return await glob.glob(search, {cwd: this.directory, ignore: this.ignore}).then((files) => {
			for (var i = files.length - 1; i >= 0; i--) {
				files[i] = {
					name: path.basename(files[i]),
					contents: self.minify ? minify(`${self.directory}/${files[i]}`) : fs.readFileSync(`${process.cwd()}/dist/${files[i]}`, 'utf8')
				}
			}

			return files
		})
	}
}

module.exports = Static