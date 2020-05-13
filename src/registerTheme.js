ngapp.run(function(themeLoaderService) {
    themeLoaderService.register((theme) => {
        return `${modulePath}\\css\\${theme}`;
    });
});
