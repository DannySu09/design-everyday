module.exports = function(grunt){
    grunt.initConfig({
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'exports/',
                    src: ['**/*.{png,jpg,JPG}'],
                    dest: 'dist/'
                }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.registerTask('default', ['imagemin:dist']);
};