ngapp.controller('workflowModalController', function($scope, workflowService, themeService) {
    let updateTheme = function(module, theme) {
        const themePath = module.getTheme ? module.getTheme(theme) : null;
        if (!themePath) {
            return;
        }

        const linkElementId = `workflow${module.name}Theme`;
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

    $scope.modules = workflowService.getModules();

    $scope.selectModule = function(module) {
        $scope.module = module;
        $scope.workflows = module.workflows.map(workflowName => {
            return workflowService.getWorkflow(workflowName);
        });

        updateTheme(module, themeService.getCurrentTheme());
    };

    $scope.selectWorkflow = function(workflow) {
        $scope.workflow = workflow;
    };

    $scope.$on('themeChanged', function(e, theme) {
        if ($scope.module) {
            updateTheme($scope.module, theme);
        }
    });
});
