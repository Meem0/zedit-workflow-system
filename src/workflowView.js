ngapp.directive('workflowView', function () {
    return {
        restrict: 'E',
        templateUrl: `${modulePath}/partials/workflowView.html`,
        scope: {
            templateUrl: '<',
            controller: '<',
            input: '<',
            model: '='
        }
    };
});
