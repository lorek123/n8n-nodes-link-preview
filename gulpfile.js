const gulp = require('gulp');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const svgSprite = require('gulp-svg-sprite');

// Clean SVG files
gulp.task('clean:svg', function() {
	return gulp.src('nodes/**/*.svg')
		.pipe(svgmin({
			plugins: [
				{
					name: 'removeViewBox',
					active: false
				}
			]
		}))
		.pipe(cheerio({
			run: function($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
			},
			parserOptions: { xmlMode: true }
		}))
		.pipe(replace('&gt;', '>'))
		.pipe(gulp.dest('dist'));
});

// Build SVG sprite
gulp.task('build:icons', gulp.series('clean:svg', function() {
	return gulp.src('nodes/**/*.svg')
		.pipe(svgSprite({
			mode: {
				symbol: {
					dest: 'icons',
					sprite: 'sprite.svg'
				}
			}
		}))
		.pipe(gulp.dest('dist'));
})); 