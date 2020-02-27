ngapp.directive('stageNav', function () {
    return {
        restrict: 'E',
        templateUrl: `${modulePath}/partials/stageNav.html`,
        scope: {
            stageRoadmap: '=',
            setStage: '=',
            currentStageName: '<'
        }
    };
});
