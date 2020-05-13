ngapp.service('themeLoaderService', function($rootScope, themeService) {
    let currentId = 0;
    let listeners = [];
    let appStarted = false;

    let loadTheme = function(theme, {id, getStylesheet}) {
        const themePath = getStylesheet(theme);

        const linkElementId = `themeLoader${id}`;
        let linkElement = document.getElementById(linkElementId);
        if (!linkElement) {
            let headElement = document.getElementsByTagName('head')[0];
            if (headElement) {
                let ngHeadElement = angular.element(headElement);
                ngHeadElement.append(`<link id="${linkElementId}" rel="stylesheet" type="text/css">`);
                linkElement = document.getElementById(linkElementId);
            }
        }
        if (linkElement) {
            let ngLinkElement = angular.element(linkElement);
            ngLinkElement.attr('href', themePath);
        }
    };

    let loadAllThemes = function(theme) {
        listeners.forEach(listener => loadTheme(theme, listener));
    };

    this.register = function(getStylesheet) {
        if (typeof(getStylesheet) !== 'function') {
            return;
        }

        const listener = {
            id: ++currentId,
            getStylesheet
        };
        listeners.push(listener);

        if (appStarted) {
            loadTheme(themeService.getCurrentTheme(), listener);
        }
    };

    $rootScope.$on('appStart', () => {
        appStarted = true;
        loadAllThemes(themeService.getCurrentTheme());

        // HACK - should not use $$childHead, hopefully can move themeChanged to $rootScope
        if ($rootScope && $rootScope.$$childHead) {
            $rootScope.$$childHead.$on('themeChanged', function(e, theme) {
                loadAllThemes(theme);
            });
        }
    });
});