var gulp = require('gulp');
var gulpif = require('gulp-if');
var argv = require('yargs').argv;
var concat = require('gulp-concat');
var autoprefixer = require('gulp-autoprefixer');
var sass = require('gulp-sass');
var csso = require('gulp-csso');
var babel = require('gulp-babel');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');

gulp.task('sass', function () {
    return gulp.src('client/scss/main.scss')
        .pipe(plumber())
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(gulpif(argv.production, csso()))
        .pipe(gulp.dest('client/public/css'));
});

gulp.task('js', function () {
    return gulp.src(['client/js/app.js',])
        .pipe(concat('application.js'))
        .pipe(babel({presets: ['env']}))
        .pipe(gulpif(argv.production, uglify()))
        .pipe(gulp.dest('client/public/js'));
});

gulp.task('html', function () {
    return gulp.src(['client/index.html',])
        .pipe(gulp.dest('client/public'));
});

gulp.task('watch', function () {
    gulp.watch('client/scss/**/*.scss', ['sass']);
    gulp.watch('client/js/**/*.js', ['js']);
    gulp.watch('client/index.html', ['html']);
});

gulp.task('build', ['sass', 'js', 'html']);
gulp.task('default', ['build', 'watch']);
